import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Lock, Mail, Radio, Ticket, WifiOff } from "lucide-react";
import {
  confirmPayment,
  createBooking,
  createPaymentIntent,
  fetchSeatState,
  lockSeats,
  releaseSeats,
} from "@/features/booking/api/bookingsApi";
import { buildSeatLayout, tierPrice } from "@/features/booking/data/seatLayout";
import { createBookingSocket } from "@/shared/services/socketClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const Route = createFileRoute("/book/$showId")({
  component: BookingPage,
  validateSearch: (s) => ({
    time: typeof s.time === "string" ? s.time : "",
    theater: typeof s.theater === "string" ? s.theater : "",
    movie: typeof s.movie === "string" ? s.movie : "",
    movieId: typeof s.movieId === "string" ? s.movieId : "",
    theaterId: typeof s.theaterId === "string" ? s.theaterId : "",
  }),
});

function getOwnerId() {
  if (typeof window === "undefined") return "server-owner";
  const existing = window.localStorage.getItem("bms-seat-owner-id");
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `owner_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem("bms-seat-owner-id", created);
  return created;
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) resolve({ ok: false });
    }, 3500);

    socket.emit(event, payload, (result) => {
      settled = true;
      clearTimeout(timer);
      resolve(result ?? { ok: false });
    });
  });
}

function loadCheckoutScript(src) {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout is unavailable."));
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Payment checkout failed to load."));
    document.body.appendChild(script);
  });
}

function BookingPage() {
  const search = Route.useSearch();
  const { showId } = Route.useParams();
  const navigate = useNavigate();
  const layout = useMemo(buildSeatLayout, []);
  const [ownerId] = useState(getOwnerId);
  const [selected, setSelected] = useState([]);
  const [seatState, setSeatState] = useState({ booked: [], locks: [], lockTtlMs: 5 * 60 * 1000 });
  const [connection, setConnection] = useState("connecting");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [tick, setTick] = useState(0);
  const socketRef = useRef(null);
  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setConnection("connecting");

    fetchSeatState(showId)
      .then((state) => active && setSeatState(state))
      .catch(() => active && setConnection("offline"));

    createBookingSocket(ownerId)
      .then((socket) => {
        if (!active || !socket) return;

        socketRef.current = socket;
        socket.on("connect", () => setConnection("live"));
        socket.on("disconnect", () => setConnection("offline"));
        socket.on("seat-state", (state) => setSeatState(state));
        socket.emit("join-show", { showId }, (result) => {
          if (result?.state) setSeatState(result.state);
        });
      })
      .catch(() => setConnection("offline"));

    return () => {
      active = false;
      const seats = selectedRef.current;
      const socket = socketRef.current;
      if (seats.length > 0) {
        if (socket?.connected) {
          socket.emit("release-seats", { showId, seats });
        } else {
          releaseSeats({ showId, seats, ownerId }).catch(() => {});
        }
      }
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [ownerId, showId]);

  const bookedSet = useMemo(() => new Set(seatState.booked), [seatState.booked]);
  const lockMap = useMemo(
    () => new Map(seatState.locks.map((lock) => [lock.seat, lock])),
    [seatState.locks],
  );

  const selectedSeats = useMemo(() => [...selected].sort(), [selected]);
  const total = selected.reduce((sum, id) => {
    const row = id.charAt(0);
    return sum + tierPrice[layout.tierFor(row)];
  }, 0);
  const ownLocks = seatState.locks.filter(
    (lock) => lock.ownerId === ownerId && selected.includes(lock.seat),
  );
  const nextExpiry = ownLocks.length ? Math.min(...ownLocks.map((lock) => lock.expiresAt)) : 0;
  const secondsLeft = Math.max(0, Math.floor((nextExpiry - Date.now()) / 1000));
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  void tick;

  const syncState = (result) => {
    if (result?.state) setSeatState(result.state);
  };

  const lockSeat = async (id) => {
    let result;
    try {
      const socket = socketRef.current;
      result = socket?.connected
        ? await emitWithAck(socket, "lock-seats", { showId, seats: [id] })
        : await lockSeats({ showId, seats: [id], ownerId });
    } catch (error) {
      result = {
        ok: false,
        conflictSeats: error.response?.data?.conflictSeats ?? [],
        state: error.response?.data?.state,
      };
    }

    syncState(result);
    if (!result.ok) {
      setMessage(
        result.conflictSeats?.length ? `${id} is no longer available.` : "Seat lock failed.",
      );
      return;
    }

    setSelected((cur) => (cur.includes(id) ? cur : [...cur, id]));
    setMessage("");
  };

  const releaseSeat = async (id) => {
    setSelected((cur) => cur.filter((seat) => seat !== id));
    try {
      const socket = socketRef.current;
      const result = socket?.connected
        ? await emitWithAck(socket, "release-seats", { showId, seats: [id] })
        : await releaseSeats({ showId, seats: [id], ownerId });
      syncState(result);
    } catch {
      setMessage("Seat release will sync shortly.");
    }
  };

  const toggle = async (id) => {
    const lock = lockMap.get(id);
    const isLockedByOther = lock && lock.ownerId !== ownerId;
    if (bookedSet.has(id) || isLockedByOther || isPaying) return;
    if (selected.includes(id)) {
      await releaseSeat(id);
      return;
    }
    if (selected.length >= 10) {
      setMessage("You can select up to 10 seats in one booking.");
      return;
    }
    await lockSeat(id);
  };

  const openRazorpayCheckout = async (payment) => {
    await loadCheckoutScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable.");

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amountMinor,
        currency: payment.currency,
        name: "BookMyScreen",
        description: `${search.movie || "Movie"} tickets`,
        order_id: payment.orderId,
        prefill: { email },
        theme: { color: "#e4475b" },
        handler: async (response) => {
          try {
            resolve(
              await confirmPayment({
                provider: "razorpay",
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            );
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment was cancelled.")),
        },
      });
      checkout.open();
    });
  };

  const handlePay = async () => {
    if (selectedSeats.length === 0) return;
    setIsPaying(true);
    setMessage("Opening secure checkout...");

    try {
      const intent = await createPaymentIntent(total);
      const payment =
        intent.payment.provider === "razorpay"
          ? await openRazorpayCheckout(intent.payment)
          : await confirmPayment({
              paymentId: intent.payment.id,
              provider: intent.payment.provider,
            });
      const result = await createBooking({
        showId,
        ownerId,
        movieId: search.movieId || search.movie || "movie",
        movie: search.movie || "Movie",
        theaterId: search.theaterId,
        theater: search.theater || "Theater",
        time: search.time || "Showtime",
        seats: selectedSeats,
        total,
        email,
        paymentId: payment.payment.id,
        paymentProvider: payment.payment.provider,
      });
      const booking = result.booking;
      await navigate({
        to: "/confirmation",
        search: {
          ref: booking.ref,
          seats: booking.seats.join(","),
          total: booking.total,
          movie: booking.movie,
          theater: booking.theater,
          time: booking.time,
          ticketUrl: result.ticketUrl,
          invoiceUrl: result.invoiceUrl,
        },
      });
    } catch (error) {
      setMessage(error.response?.data?.error ?? "Payment or booking failed. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-44">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold">{search.movie || "Movie"}</h1>
          <p className="text-sm text-muted-foreground">
            {search.theater} - {search.time} - Screen 3
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
            {connection === "live" ? (
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            )}
            {connection === "live" ? "Live seat sync" : "Reconnecting sync"}
          </div>
          {selected.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              <Lock className="h-3.5 w-3.5" />
              Locked - {mins}:{secs}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-5 text-xs text-muted-foreground">
        <Legend color="bg-card border border-border" label="Available" />
        <Legend color="bg-primary" label="Selected" />
        <Legend color="bg-amber-400/70" label="Locked by another user" />
        <Legend color="bg-muted-foreground/40" label="Booked" />
        <div className="ml-auto flex gap-4">
          <Legend color="bg-[var(--platinum)]" label="Platinum Rs 180" />
          <Legend color="bg-[var(--gold)]" label="Gold Rs 250" />
          <Legend color="bg-[var(--vip)]" label="VIP Rs 400" />
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-3xl">
        <div className="mx-auto h-1 w-full max-w-md rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          All eyes this way please
        </p>
      </div>

      <div className="mt-10 overflow-x-auto">
        <div className="mx-auto inline-flex min-w-full flex-col items-center gap-6">
          {["platinum", "gold", "vip"].map((tier) => {
            const rowsForTier = layout.rows.filter((r) => layout.tierFor(r) === tier);
            return (
              <div key={tier} className="w-full">
                <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tier} - Rs {tierPrice[tier]}
                </p>
                <div className="space-y-2">
                  {rowsForTier.map((row) => (
                    <div key={row} className="flex items-center justify-center gap-1.5">
                      <span className="w-5 text-center text-[11px] font-medium text-muted-foreground">
                        {row}
                      </span>
                      <div className="flex gap-1.5">
                        {Array.from({ length: layout.cols }, (_, i) => i + 1).map((c) => {
                          const id = `${row}${c}`;
                          const lock = lockMap.get(id);
                          const isBooked = bookedSet.has(id);
                          const isLockedByOther = lock && lock.ownerId !== ownerId;
                          const isSel = selected.includes(id);
                          const isAisle = c === 7;
                          const stateClass = isBooked
                            ? "cursor-not-allowed border-transparent bg-muted-foreground/30 text-transparent"
                            : isLockedByOther
                              ? "cursor-not-allowed border-amber-400/50 bg-amber-400/30 text-transparent"
                              : isSel
                                ? "scale-105 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                : "border-border/60 bg-card text-muted-foreground hover:border-primary hover:text-foreground";

                          return (
                            <div key={id} className="flex items-center gap-1.5">
                              <button
                                disabled={isBooked || isLockedByOther}
                                onClick={() => toggle(id)}
                                className={`h-7 w-7 rounded-md border text-[10px] font-medium transition-all ${stateClass}`}
                              >
                                {c}
                              </button>
                              {isAisle && <span className="w-3" />}
                            </div>
                          );
                        })}
                      </div>
                      <span className="w-5 text-center text-[11px] font-medium text-muted-foreground">
                        {row}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl gap-3 px-4 py-4 md:grid-cols-[1fr_280px_auto] md:items-center">
          <div>
            <p className="text-xs text-muted-foreground">
              {selected.length} {selected.length === 1 ? "seat" : "seats"} selected
            </p>
            <p className="font-semibold">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">Pick your seats to continue</span>
              ) : (
                <>
                  {selectedSeats.join(", ")} - <span className="text-primary">Rs {total}</span>
                </>
              )}
            </p>
            {message && <p className="mt-1 text-xs text-amber-400">{message}</p>}
          </div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email for ticket"
              className="h-11 pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/">Cancel</Link>
            </Button>
            <Button
              size="lg"
              disabled={selected.length === 0 || isPaying || secondsLeft === 0}
              onClick={handlePay}
              className="gap-2"
            >
              {isPaying ? (
                <Clock3 className="h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              {isPaying ? "Confirming..." : `Pay Rs ${total || 0}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}

export { Route };
