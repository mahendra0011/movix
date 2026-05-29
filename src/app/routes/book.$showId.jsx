import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Mail, Radio, Ticket, WifiOff } from "lucide-react";
import {
  confirmPayment,
  createBooking,
  createPaymentIntent,
  fetchSeatState,
  sendTicketOtp,
  verifyTicketOtp,
} from "@/features/booking/api/bookingsApi";
import { buildSeatLayout, tierPrice } from "@/features/booking/data/seatLayout";
import { createBookingSocket } from "@/shared/services/socketClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const Route = createFileRoute("/book/$showId")({
  component: BookingPage,
  validateSearch: (s) => ({
    time: typeof s.time === "string" ? s.time : "",
    date: typeof s.date === "string" ? s.date : "",
    theater: typeof s.theater === "string" ? s.theater : "",
    movie: typeof s.movie === "string" ? s.movie : "",
    movieId: typeof s.movieId === "string" ? s.movieId : "",
    theaterId: typeof s.theaterId === "string" ? s.theaterId : "",
    screen: typeof s.screen === "string" ? s.screen : "Screen 3",
    platinumPrice: parseSearchPrice(s.platinumPrice, tierPrice.platinum),
    silverPrice: parseSearchPrice(s.silverPrice, tierPrice.silver),
    goldPrice: parseSearchPrice(s.goldPrice, tierPrice.gold),
    vipPrice: parseSearchPrice(s.vipPrice, tierPrice.vip),
    seatRows: parseSearchInteger(s.seatRows, undefined),
    seatCols: parseSearchInteger(s.seatCols, undefined),
    platinumRows: parseSearchInteger(s.platinumRows, undefined),
    silverRows: parseSearchInteger(s.silverRows, undefined),
    vipRows: parseSearchInteger(s.vipRows, undefined),
    aisleAfter: parseSearchInteger(s.aisleAfter, undefined),
    blockedSeats: typeof s.blockedSeats === "string" ? s.blockedSeats : "",
  }),
});

function parseSearchPrice(value, fallback) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
}

function parseSearchInteger(value, fallback) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : fallback;
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
  const layout = useMemo(
    () =>
      buildSeatLayout({
        rowCount: search.seatRows,
        seatsPerRow: search.seatCols,
        platinumRows: search.platinumRows,
        silverRows: search.silverRows,
        vipRows: search.vipRows,
        aisleAfter: search.aisleAfter,
        blockedSeats: search.blockedSeats,
      }),
    [
      search.aisleAfter,
      search.blockedSeats,
      search.platinumRows,
      search.seatCols,
      search.seatRows,
      search.silverRows,
      search.vipRows,
    ],
  );
  const [selected, setSelected] = useState([]);
  const [seatState, setSeatState] = useState({ booked: [] });
  const [connection, setConnection] = useState("connecting");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [ticketOtp, setTicketOtp] = useState("");
  const [ticketOtpSent, setTicketOtpSent] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let active = true;
    setConnection("connecting");

    fetchSeatState(showId)
      .then((state) => {
        if (!active) return;
        setSeatState(state);
        setConnection((current) => (current === "connecting" ? "local" : current));
      })
      .catch(() => active && setConnection("offline"));

    createBookingSocket()
      .then((socket) => {
        if (!active) return;
        if (!socket) {
          setConnection("local");
          return;
        }

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
      const socket = socketRef.current;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [showId]);

  const bookedSet = useMemo(() => new Set(seatState.booked ?? []), [seatState.booked]);

  const selectedSeats = useMemo(() => [...selected].sort(), [selected]);
  const showTierPrice = useMemo(
    () => ({
      platinum: search.platinumPrice,
      silver: search.silverPrice,
      gold: search.goldPrice,
      vip: search.vipPrice,
    }),
    [search.goldPrice, search.platinumPrice, search.silverPrice, search.vipPrice],
  );
  const total = selected.reduce((sum, id) => {
    const row = id.match(/^[A-Z]+/)?.[0] ?? "";
    return sum + showTierPrice[layout.tierFor(row)];
  }, 0);

  useEffect(() => {
    setSelected((current) => {
      const next = current.filter((seat) => !bookedSet.has(seat));
      return next.length === current.length ? current : next;
    });
  }, [bookedSet]);

  const toggle = (id) => {
    if (bookedSet.has(id) || isPaying) return;
    if (selected.includes(id)) {
      setSelected((current) => current.filter((seat) => seat !== id));
      return;
    }
    if (selected.length >= 10) {
      setMessage("You can select up to 10 seats in one booking.");
      return;
    }
    setSelected((current) => [...current, id]);
    setMessage("");
  };

  const updateEmail = (event) => {
    setEmail(event.target.value);
    setTicketOtp("");
    setTicketOtpSent(false);
    setEmailVerificationToken("");
  };

  const requestTicketOtp = async () => {
    setOtpBusy(true);
    setMessage("");
    try {
      const result = await sendTicketOtp(email);
      setTicketOtpSent(true);
      setMessage(result.message ?? "Ticket OTP sent to your email.");
    } catch (error) {
      setMessage(error.response?.data?.error ?? "Unable to send ticket OTP.");
    } finally {
      setOtpBusy(false);
    }
  };

  const confirmTicketOtp = async () => {
    setOtpBusy(true);
    setMessage("");
    try {
      const result = await verifyTicketOtp({ email, otp: ticketOtp });
      setEmailVerificationToken(result.emailVerificationToken);
      setMessage(result.message ?? "Ticket email verified.");
    } catch (error) {
      setMessage(error.response?.data?.error ?? "Ticket OTP verification failed.");
    } finally {
      setOtpBusy(false);
    }
  };

  const openRazorpayCheckout = async (payment) => {
    await loadCheckoutScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable.");

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amountMinor,
        currency: payment.currency,
        name: "moviex",
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
    if (!emailVerificationToken) {
      setMessage("Verify your ticket email with OTP before payment.");
      return;
    }
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
        movieId: search.movieId || search.movie || "movie",
        movie: search.movie || "Movie",
        theaterId: search.theaterId,
        theater: search.theater || "Theater",
        screen: search.screen || "Screen 3",
        time: search.date ? `${search.date} ${search.time}` : search.time || "Showtime",
        seats: selectedSeats,
        total,
        email,
        emailVerificationToken,
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
    <div className="mx-auto max-w-[1560px] px-4 py-8 pb-44 sm:px-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold">{search.movie || "Movie"}</h1>
          <p className="text-sm text-muted-foreground">
            {search.theater} - {search.date ? `${search.date} - ` : ""}
            {search.time} - {search.screen || "Screen 3"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
            {connection === "live" ? (
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
            ) : connection === "local" ? (
              <Radio className="h-3.5 w-3.5 text-primary" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            )}
            {connection === "live"
              ? "Live seat updates"
              : connection === "local"
                ? "Instant local updates"
                : "Reconnecting updates"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-5 text-xs text-muted-foreground">
        <Legend color="bg-card border border-border" label="Available" />
        <Legend color="bg-primary" label="Selected" />
        <Legend color="bg-muted-foreground/40" label="Booked" />
        {layout.blockedSet.size > 0 && (
          <Legend color="bg-muted-foreground/20" label="Unavailable" />
        )}
        <div className="ml-auto flex gap-4">
          <Legend color="bg-[var(--platinum)]" label={`Platinum Rs ${showTierPrice.platinum}`} />
          <Legend color="bg-[var(--silver)]" label={`Silver Rs ${showTierPrice.silver}`} />
          <Legend color="bg-[var(--gold)]" label={`Gold Rs ${showTierPrice.gold}`} />
          <Legend color="bg-[var(--vip)]" label={`VIP Rs ${showTierPrice.vip}`} />
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
          {["platinum", "silver", "gold", "vip"].map((tier) => {
            const rowsForTier = layout.rows.filter((r) => layout.tierFor(r) === tier);
            return (
              <div key={tier} className="w-full">
                <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tier} - Rs {showTierPrice[tier]}
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
                          const isBooked = bookedSet.has(id);
                          const isBlocked = layout.blockedSet.has(id);
                          const isSel = selected.includes(id);
                          const isAisle = layout.aisleAfter > 0 && c === layout.aisleAfter;
                          const stateClass = isBlocked
                            ? "cursor-not-allowed border-transparent bg-muted-foreground/20 text-transparent"
                            : isBooked
                              ? "cursor-not-allowed border-transparent bg-muted-foreground/30 text-transparent"
                              : isSel
                                ? "scale-105 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                : "border-border/60 bg-card text-muted-foreground hover:border-primary hover:text-foreground";

                          return (
                            <div key={id} className="flex items-center gap-1.5">
                              <button
                                disabled={isBlocked || isBooked}
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
        <div className="mx-auto grid max-w-[1560px] gap-3 px-4 py-4 sm:px-5 md:grid-cols-[1fr_390px_auto] md:items-center lg:px-6">
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
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={updateEmail}
                  placeholder="Email for ticket"
                  className="h-11 pl-9"
                />
              </div>
              <Button
                type="button"
                variant={emailVerificationToken ? "secondary" : "outline"}
                disabled={otpBusy || !email || Boolean(emailVerificationToken)}
                onClick={requestTicketOtp}
              >
                {emailVerificationToken ? "Verified" : ticketOtpSent ? "Resend OTP" : "Send OTP"}
              </Button>
            </div>
            {ticketOtpSent && !emailVerificationToken && (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  value={ticketOtp}
                  onChange={(event) => setTicketOtp(event.target.value)}
                  placeholder="Enter ticket OTP"
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={otpBusy || ticketOtp.length < 4}
                  onClick={confirmTicketOtp}
                >
                  Verify
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/">Cancel</Link>
            </Button>
            <Button
              size="lg"
              disabled={selected.length === 0 || !emailVerificationToken || isPaying}
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
