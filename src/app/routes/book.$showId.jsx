import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Ticket } from "lucide-react";
import { createBooking } from "@/features/booking/api/bookingsApi";
import { buildSeatLayout, tierPrice } from "@/features/booking/data/seatLayout";
import { Button } from "@/shared/components/ui/button";
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
function BookingPage() {
  const search = Route.useSearch();
  const { showId } = Route.useParams();
  const navigate = useNavigate();
  const layout = useMemo(buildSeatLayout, []);
  const [selected, setSelected] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [isPaying, setIsPaying] = useState(false);
  useEffect(() => {
    if (selected.length === 0) {
      setSecondsLeft(5 * 60);
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1e3);
    return () => clearInterval(t);
  }, [selected.length]);
  const toggle = (id) => {
    if (layout.bookedSet.has(id)) return;
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 10 ? cur : [...cur, id],
    );
  };
  const total = selected.reduce((sum, id) => {
    const row = id.charAt(0);
    return sum + tierPrice[layout.tierFor(row)];
  }, 0);
  const selectedSeats = useMemo(() => [...selected].sort(), [selected]);
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const handlePay = async () => {
    if (selectedSeats.length === 0) return;
    setIsPaying(true);
    try {
      const booking = await createBooking({
        showId,
        movieId: search.movieId || search.movie || "movie",
        movie: search.movie || "Movie",
        theaterId: search.theaterId,
        theater: search.theater || "Theater",
        time: search.time || "Showtime",
        seats: selectedSeats,
        total,
      });
      await navigate({
        to: "/confirmation",
        search: {
          ref: booking.ref,
          seats: booking.seats.join(","),
          total: booking.total,
          movie: booking.movie,
          theater: booking.theater,
          time: booking.time,
        },
      });
    } finally {
      setIsPaying(false);
    }
  };
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-40">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold">{search.movie || "Movie"}</h1>
          <p className="text-sm text-muted-foreground">
            {search.theater} - {search.time} - Screen 3
          </p>
        </div>
        {selected.length > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
            <Lock className="h-3.5 w-3.5" />
            Seats locked - {mins}:{secs}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-5 text-xs text-muted-foreground">
        <Legend color="bg-card border border-border" label="Available" />
        <Legend color="bg-primary" label="Selected" />
        <Legend color="bg-muted-foreground/40" label="Booked" />
        <div className="ml-auto flex gap-4">
          <Legend color="bg-[var(--platinum)]" label="Platinum Rs 180" />
          <Legend color="bg-[var(--gold)]" label="Gold Rs 250" />
          <Legend color="bg-[var(--vip)]" label="VIP Rs 400" />
        </div>
      </div>

      {/* Screen */}
      <div className="mx-auto mt-10 max-w-3xl">
        <div className="mx-auto h-1 w-full max-w-md rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          All eyes this way please
        </p>
      </div>

      {/* Seats */}
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
                          const isBooked = layout.bookedSet.has(id);
                          const isSel = selected.includes(id);
                          const isAisle = c === 7;
                          return (
                            <div key={id} className="flex items-center gap-1.5">
                              <button
                                disabled={isBooked}
                                onClick={() => toggle(id)}
                                className={`h-7 w-7 rounded-md border text-[10px] font-medium transition-all ${isBooked ? "cursor-not-allowed border-transparent bg-muted-foreground/30 text-transparent" : isSel ? "scale-105 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "border-border/60 bg-card text-muted-foreground hover:border-primary hover:text-foreground"}`}
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

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
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
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/">Cancel</Link>
            </Button>
            <Button
              size="lg"
              disabled={selected.length === 0 || isPaying}
              onClick={handlePay}
              className="gap-2"
            >
              <Ticket className="h-4 w-4" />
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
