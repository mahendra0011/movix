import { env } from "../config/env.js";

async function sendEmail({ to, subject, html }) {
  if (!to) return { sent: false, reason: "missing-recipient" };
  if (!env.brevoApiKey || !env.brevoFromEmail) {
    console.log(`[email:provider-not-configured] ${subject} -> ${to}`);
    return { sent: false, reason: "brevo-not-configured" };
  }

  const response = await fetch(env.brevoApiUrl, {
    method: "POST",
    headers: {
      "api-key": env.brevoApiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: env.brevoFromEmail, name: env.brevoFromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API email failed: ${response.status} ${body}`);
  }

  return { sent: true, provider: "brevo-api", response: await response.json() };
}

async function sendBookingEmail(booking) {
  if (!booking.email) return { sent: false, reason: "missing-recipient" };
  return sendEmail({
    to: booking.email,
    subject: `Your BookMyScreen ticket ${booking.ref}`,
    html: `
      <h2>Booking confirmed</h2>
      <p>Your tickets for <strong>${booking.movie}</strong> are ready.</p>
      <p><strong>Theater:</strong> ${booking.theater}</p>
      <p><strong>Show:</strong> ${booking.time}</p>
      <p><strong>Seats:</strong> ${booking.seats.join(", ")}</p>
      <p><strong>Total:</strong> Rs ${booking.total}</p>
      <p>Reference: ${booking.ref}</p>
    `,
  });
}

async function sendOtpEmail(email, otp) {
  return sendEmail({
    to: email,
    subject: "Your BookMyScreen OTP",
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  });
}

export { sendBookingEmail, sendEmail, sendOtpEmail };
