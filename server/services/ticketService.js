import PDFDocument from "pdfkit";
import QRCode from "qrcode";

function ticketPayload(booking) {
  return JSON.stringify({
    ref: booking.ref,
    movie: booking.movie,
    theater: booking.theater,
    time: booking.time,
    seats: booking.seats,
    total: booking.total,
  });
}

async function generateQrDataUrl(booking) {
  return QRCode.toDataURL(ticketPayload(booking), { margin: 1, width: 220 });
}

async function generateQrPng(booking) {
  return QRCode.toBuffer(ticketPayload(booking), { margin: 1, width: 260 });
}

async function generateTicketPdf(booking, { invoice = false } = {}) {
  const qrBuffer = await generateQrPng(booking);

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text(invoice ? "movix Invoice" : "movix E-Ticket");
    doc.moveDown();
    doc.fontSize(11).fillColor("#555").text(`Reference: ${booking.ref}`);
    doc.moveDown();
    doc.fillColor("#111").fontSize(15).text(booking.movie);
    doc.fontSize(11).text(`Theater: ${booking.theater}`);
    doc.text(`Screen: ${booking.screen || "Screen 3"}`);
    doc.text(`Showtime: ${booking.time}`);
    doc.text(`Seats: ${booking.seats.join(", ")}`);
    doc.text(`Payment: ${booking.paymentStatus}`);
    doc.moveDown();
    doc.fontSize(14).text(`Total: Rs ${booking.total}`);

    if (!invoice) {
      doc.image(qrBuffer, 360, 125, { width: 150 });
      doc.fontSize(9).fillColor("#666").text("Scan at cinema entrance", 360, 280, {
        width: 150,
        align: "center",
      });
    }

    doc.moveDown(3);
    doc.fontSize(9).fillColor("#777").text("Issued by movix.");
    doc.end();
  });
}

export { generateQrDataUrl, generateQrPng, generateTicketPdf };
