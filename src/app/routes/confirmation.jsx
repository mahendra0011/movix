import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, FileText, Ticket } from "lucide-react";
import QRCode from "qrcode";
import { apiUrl } from "@/features/api/baseApi";
import { Button } from "@/shared/components/ui/button";

function Confirmation() {
  const [searchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  const ref = typeof params.ref === "string" ? params.ref : "";
  const seats = typeof params.seats === "string" ? params.seats : "";
  const total = typeof params.total === "string" ? Number(params.total) : Number(params.total ?? 0);
  const movie = typeof params.movie === "string" ? params.movie : "";
  const theater = typeof params.theater === "string" ? params.theater : "";
  const time = typeof params.time === "string" ? params.time : "";
  const ticketUrl = typeof params.ticketUrl === "string" ? params.ticketUrl : "";
  const invoiceUrl = typeof params.invoiceUrl === "string" ? params.invoiceUrl : "";
  const qrDataUrl = typeof params.qr === "string" && params.qr ? params.qr : "";
  const [clientQr, setClientQr] = useState("");
  const [qrError, setQrError] = useState(false);
  const canvasRef = useRef(null);

  const bookingRef = ref;
  const ticketHref = apiUrl(ticketUrl || `/api/bookings/${bookingRef}/ticket.pdf`);
  const invoiceHref = apiUrl(invoiceUrl || `/api/bookings/${bookingRef}/invoice.pdf`);

  useEffect(() => {
    if (qrDataUrl) return;
    const payload = JSON.stringify({
      ref: bookingRef,
      movie,
      theater,
      time,
      seats: seats.split(","),
      total,
    });
    QRCode.toDataURL(payload, { margin: 1, width: 220 })
      .then(setClientQr)
      .catch(() => setQrError(true));
  }, [bookingRef, movie, theater, time, seats, total, qrDataUrl]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Booking confirmed!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your e-ticket is ready. Show the QR code at the cinema entrance.
        </p>
      </div>
      <div className="relative mt-10 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex items-center justify-between border-b border-dashed border-border/60 bg-primary/10 px-6 py-4">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <Ticket className="h-4 w-4 text-primary" /> E-Ticket
          </div>
          <span className="text-xs text-muted-foreground">Ref - {bookingRef}</span>
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Movie</p>
              <p className="text-lg font-semibold">{movie || "Movie"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Theater" value={theater} />
              <Field label="Showtime" value={time} />
              <Field label="Seats" value={seats.replaceAll(",", ", ")} />
              <Field label="Total paid" value={`Rs ${total}`} />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="grid h-32 w-32 place-items-center rounded-lg border border-border bg-background">
              {qrError ? (
                <span className="text-xs text-muted-foreground">QR unavailable</span>
              ) : (
                <img
                  src={qrDataUrl || clientQr || apiUrl(`/api/bookings/${bookingRef}/qr.png`)}
                  alt={`QR code for ${bookingRef}`}
                  className="h-28 w-28 rounded"
                  onError={() => setQrError(true)}
                />
              )}
            </div>
          </div>
        </div>
        <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
        <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" className="gap-2" asChild>
          <a href={ticketHref} target="_blank" rel="noreferrer">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </Button>
        <Button variant="secondary" className="gap-2" asChild>
          <a href={invoiceHref} target="_blank" rel="noreferrer">
            <FileText className="h-4 w-4" /> Invoice
          </a>
        </Button>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}
export { Confirmation };
