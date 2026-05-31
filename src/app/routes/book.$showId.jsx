import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/components/ui/input-otp";

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
  const auth = useSelector((state) => state.auth);
  const bookingEmail = auth.hydrated ? (auth.user?.email ?? "") : "";
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
  const [seatState, setSeatState] = useState({ booked: [], held: [], heldByMe: [] });
  const [connection, setConnection] = useState("connecting");
  const [message, setMessage] = useState("");
  const [ticketOtp, setTicketOtp] = useState("");
  const [ticketOtpSent, setTicketOtpSent] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const socketRef = useRef(null);
  const selectedRef = useRef([]);
  const holdTokenRef = useRef("");

  useEffect(() => {
    let active = true;
    setConnection("connecting");

    fetchSeatState(showId)
      .then((state) => {
        if (!active) return;
        setSeatState(normalizeLiveSeatState(state));
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
        const joinShowRoom = () => {
          socket.emit("join-show", { showId }, (result) => {
            holdTokenRef.current = result?.holdToken || socket.id || "";
            if (result?.state) setSeatState(normalizeLiveSeatState(result.state));
          });
        };
        const refreshSelectedHolds = () => {
          if (selectedRef.current.length === 0) return;
          socket.emit("hold-seats", { showId, seats: selectedRef.current }, (result) => {
            holdTokenRef.current = result?.holdToken || socket.id || "";
            if (result?.state) setSeatState(normalizeLiveSeatState(result.state));
          });
        };

        socket.on("connect", () => {
          setConnection("live");
          holdTokenRef.current = socket.id || "";
          joinShowRoom();
          refreshSelectedHolds();
        });
        socket.on("disconnect", () => {
          setConnection("offline");
          holdTokenRef.current = "";
        });
        socket.on("connect_error", () => setConnection("offline"));
        socket.on("seat-state", (state) => setSeatState(normalizeLiveSeatState(state)));
        if (socket.connected) {
          setConnection("live");
          joinShowRoom();
          refreshSelectedHolds();
        }
      })
      .catch(() => setConnection("offline"));

    return () => {
      active = false;
      const socket = socketRef.current;
      socket?.disconnect();
      socketRef.current = null;
      holdTokenRef.current = "";
    };
  }, [showId]);

  const bookedSet = useMemo(() => new Set(seatState.booked ?? []), [seatState.booked]);
  const heldSet = useMemo(() => new Set(seatState.held ?? []), [seatState.held]);

  const selectedSeats = useMemo(() => [...selected].sort(), [selected]);
  const selectedSet = useMemo(() => new Set(selectedSeats), [selectedSeats]);
  const heldByMeSet = useMemo(() => new Set(seatState.heldByMe ?? []), [seatState.heldByMe]);
  const heldByOtherSet = useMemo(() => {
    const seats = [...heldSet].filter((seat) => !heldByMeSet.has(seat) && !selectedSet.has(seat));
    return new Set(seats);
  }, [heldByMeSet, heldSet, selectedSet]);
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
    selectedRef.current = selectedSeats;
  }, [selectedSeats]);

  useEffect(() => {
    setSelected((current) => {
      const next = current.filter((seat) => !bookedSet.has(seat) && !heldByOtherSet.has(seat));
      return next.length === current.length ? current : next;
    });
  }, [bookedSet, heldByOtherSet]);

  const emitBookingSocket = (event, payload, { optional = true } = {}) => {
    const socket = socketRef.current;
    if (!socket?.connected) return Promise.resolve({ ok: optional });

    return new Promise((resolve) => {
      socket.timeout(2500).emit(event, payload, (error, result) => {
        if (error) {
          resolve({ ok: optional, error });
          return;
        }
        resolve(result ?? { ok: true });
      });
    });
  };

  const holdSeats = async (seats) => {
    const seatList = [...new Set(seats.map(String).filter(Boolean))];
    if (seatList.length === 0) return { ok: true };

    const result = await emitBookingSocket(
      "hold-seats",
      { showId, seats: seatList },
      { optional: true },
    );
    holdTokenRef.current = result.holdToken || socketRef.current?.id || holdTokenRef.current;
    if (result.state) setSeatState(normalizeLiveSeatState(result.state));
    return result;
  };

  const releaseSeats = (seats) => {
    const seatList = [...new Set(seats.map(String).filter(Boolean))];
    if (seatList.length === 0) return;

    emitBookingSocket("release-seats", { showId, seats: seatList }, { optional: true }).then(
      (result) => {
        if (result.state) setSeatState(normalizeLiveSeatState(result.state));
      },
    );
  };

  const toggle = async (id) => {
    if (bookedSet.has(id) || heldByOtherSet.has(id) || isPaying) return;
    if (selected.includes(id)) {
      releaseSeats([id]);
      setSelected((current) => current.filter((seat) => seat !== id));
      return;
    }
    if (selected.length >= 10) {
      setMessage("You can select up to 10 seats in one booking.");
      return;
    }
    const holdResult = await holdSeats([id]);
    if (!holdResult.ok) {
      setMessage(seatConflictMessage(holdResult.conflictSeats));
      return;
    }
    setSelected((current) => [...current, id]);
    setMessage("");
  };

  useEffect(() => {
    setTicketOtp("");
    setTicketOtpSent(false);
    setEmailVerificationToken("");
    setOtpMessage("");
  }, [bookingEmail]);

  const requestTicketOtp = async () => {
    if (!bookingEmail) {
      setOtpMessage("Login first so OTP can be sent to your account email.");
      return;
    }

    setOtpBusy(true);
    setOtpMessage("");
    try {
      const result = await sendTicketOtp(bookingEmail);
      setTicketOtpSent(true);
      setTicketOtp("");
      setOtpMessage(
        `${result.message ?? "Ticket OTP sent to your login email."} Ticket will be emailed here after booking.`,
      );
    } catch (error) {
      setOtpMessage(error.response?.data?.error ?? "Unable to send ticket OTP.");
    } finally {
      setOtpBusy(false);
    }
  };

  const confirmTicketOtp = async () => {
    if (!bookingEmail) {
      setOtpMessage("Login first so OTP can be sent to your account email.");
      return;
    }

    setOtpBusy(true);
    setOtpMessage("");
    try {
      const result = await verifyTicketOtp({ email: bookingEmail, otp: ticketOtp });
      setEmailVerificationToken(result.emailVerificationToken);
      setOtpDialogOpen(false);
      setMessage(result.message ?? "Ticket email verified. Confirming payment...");
      await handlePay(result.emailVerificationToken);
    } catch (error) {
      setOtpMessage(error.response?.data?.error ?? "Ticket OTP verification failed.");
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
        name: "movix",
        description: `${search.movie || "Movie"} tickets`,
        order_id: payment.orderId,
        prefill: { email: bookingEmail },
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

  const startCheckout = async () => {
    if (selectedSeats.length === 0) return;
    if (!auth.hydrated) {
      setMessage("Checking your login before sending OTP...");
      return;
    }
    if (!bookingEmail) {
      setMessage("Login first so OTP can be sent to your account email.");
      navigate({ to: "/auth" });
      return;
    }

    const holdResult = await holdSeats(selectedSeats);
    if (!holdResult.ok) {
      setMessage(seatConflictMessage(holdResult.conflictSeats));
      return;
    }

    if (emailVerificationToken) {
      await handlePay(emailVerificationToken);
      return;
    }

    setOtpDialogOpen(true);
    await requestTicketOtp();
  };

  const handlePay = async (verificationToken = emailVerificationToken) => {
    if (selectedSeats.length === 0) return;
    if (!verificationToken) {
      setMessage("Verify your ticket email with OTP before payment.");
      return;
    }
    const holdResult = await holdSeats(selectedSeats);
    if (!holdResult.ok) {
      setMessage(seatConflictMessage(holdResult.conflictSeats));
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
        email: bookingEmail,
        emailVerificationToken: verificationToken,
        holdToken: holdTokenRef.current || socketRef.current?.id || "",
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
      setMessage(
        error.response?.data?.conflictSeats
          ? seatConflictMessage(error.response.data.conflictSeats)
          : (error.response?.data?.error ?? "Payment or booking failed. Please try again."),
      );
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
        <Legend color="bg-amber-400/30 border border-amber-400/50" label="Held" />
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
                          const isHeldByOther = heldByOtherSet.has(id);
                          const isSel = selected.includes(id);
                          const isAisle = layout.aisleAfter > 0 && c === layout.aisleAfter;
                          const stateClass = isBlocked
                            ? "cursor-not-allowed border-transparent bg-muted-foreground/20 text-transparent"
                            : isBooked
                              ? "cursor-not-allowed border-transparent bg-muted-foreground/30 text-transparent"
                              : isHeldByOther
                                ? "cursor-not-allowed border-amber-400/50 bg-amber-400/20 text-transparent"
                                : isSel
                                  ? "scale-105 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                  : "border-border/60 bg-card text-muted-foreground hover:border-primary hover:text-foreground";

                          return (
                            <div key={id} className="flex items-center gap-1.5">
                              <button
                                disabled={isBlocked || isBooked || isHeldByOther}
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

      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify booking OTP</DialogTitle>
            <DialogDescription>
              Enter the 6 digit code sent to your login email. Your ticket will be emailed here
              after booking.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border/60 bg-card/60 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span className="truncate font-medium">{bookingEmail || "Login required"}</span>
            </div>
          </div>
          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={6}
              value={ticketOtp}
              onChange={setTicketOtp}
              disabled={otpBusy || isPaying}
              containerClassName="justify-center gap-2"
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-11 w-10 rounded-md border border-border bg-background text-base font-semibold"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {otpMessage && <p className="text-center text-xs text-amber-400">{otpMessage}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={otpBusy || isPaying || !bookingEmail}
              onClick={requestTicketOtp}
            >
              {ticketOtpSent ? "Resend OTP" : "Send OTP"}
            </Button>
            <Button
              type="button"
              disabled={otpBusy || isPaying || ticketOtp.length !== 6}
              onClick={confirmTicketOtp}
            >
              {isPaying ? "Paying..." : otpBusy ? "Checking..." : "Verify & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <div className="rounded-lg border border-border/60 bg-card/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              OTP and ticket will be sent to
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span className="truncate font-medium">
                {auth.hydrated
                  ? bookingEmail || "Login required for OTP and ticket"
                  : "Checking login..."}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/">Cancel</Link>
            </Button>
            <Button
              size="lg"
              disabled={selected.length === 0 || otpBusy || isPaying}
              onClick={startCheckout}
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

function normalizeLiveSeatState(state) {
  return {
    showId: state?.showId ?? "",
    booked: normalizeSeatList(state?.booked),
    held: normalizeSeatList(state?.held),
    heldByMe: normalizeSeatList(state?.heldByMe),
  };
}

function normalizeSeatList(seats) {
  return Array.isArray(seats)
    ? [...new Set(seats.map((seat) => String(seat).trim()).filter(Boolean))].sort()
    : [];
}

function seatConflictMessage(conflictSeats = []) {
  const seats = normalizeSeatList(conflictSeats);
  if (seats.length === 0) return "That seat just became unavailable. Pick another seat.";
  return `${seats.slice(0, 4).join(", ")} ${
    seats.length === 1 ? "is" : "are"
  } already booked or held by another user.`;
}

export { Route };
