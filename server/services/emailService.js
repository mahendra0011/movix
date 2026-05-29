import { env } from "../config/env.js";

const brand = {
  name: "movix",
  primary: "#e11d48",
  background: "#09090b",
  card: "#111827",
  text: "#f8fafc",
  muted: "#94a3b8",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function emailLayout({ eyebrow, title, preview, body, footer = "" }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#f3f4f6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
        <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
          ${escapeHtml(preview)}
        </span>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:${brand.background};border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.22);">
                <tr>
                  <td style="padding:28px 30px;border-bottom:1px solid rgba(255,255,255,0.08);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="display:inline-block;width:34px;height:34px;line-height:34px;border-radius:10px;background:${brand.primary};color:white;text-align:center;font-weight:800;">X</div>
                          <span style="margin-left:10px;color:${brand.text};font-size:18px;font-weight:800;vertical-align:middle;">${brand.name}</span>
                        </td>
                        <td align="right" style="color:${brand.muted};font-size:12px;">Secure email</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 30px;">
                    <p style="margin:0 0 12px;color:${brand.primary};font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                    <h1 style="margin:0;color:${brand.text};font-size:28px;line-height:1.18;font-weight:850;">${escapeHtml(title)}</h1>
                    <div style="margin-top:22px;color:#dbeafe;font-size:15px;line-height:1.65;">
                      ${body}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 30px;background:${brand.card};color:${brand.muted};font-size:12px;line-height:1.6;">
                    ${footer || "This email was sent by movix. If you did not request it, you can safely ignore it."}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendEmail({ to, subject, html }) {
  if (!to) return { sent: false, reason: "missing-recipient" };
  if (!env.brevoApiKey || !env.brevoFromEmail) {
    console.log(`[email:provider-not-configured] ${subject} -> ${to}`);
    return { sent: false, reason: "brevo-not-configured" };
  }

  let response;
  try {
    response = await fetch(env.brevoApiUrl, {
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
  } catch (cause) {
    const error = new Error("Email service failed. Check Brevo API key and sender email.");
    error.status = 502;
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    const body = await response.text();
    const error = new Error("Email service failed. Check Brevo API key and sender email.");
    error.status = 502;
    error.cause = new Error(`Brevo API email failed: ${response.status} ${body}`);
    throw error;
  }

  return { sent: true, provider: "brevo-api", response: await response.json() };
}

async function sendBookingEmail(booking) {
  if (!booking.email) return { sent: false, reason: "missing-recipient" };

  const seats = (booking.seats ?? []).map(escapeHtml).join(", ");
  return sendEmail({
    to: booking.email,
    subject: `Your movix ticket ${booking.ref}`,
    html: emailLayout({
      eyebrow: "Booking confirmed",
      title: `${booking.movie} tickets are ready`,
      preview: `Your ticket ${booking.ref} is confirmed.`,
      body: `
        <p style="margin:0 0 18px;">Your booking is confirmed. Show this ticket or the QR code at the cinema entry.</p>
        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;">
          <p style="margin:0 0 10px;"><strong>Movie:</strong> ${escapeHtml(booking.movie)}</p>
          <p style="margin:0 0 10px;"><strong>Theater:</strong> ${escapeHtml(booking.theater)}</p>
          <p style="margin:0 0 10px;"><strong>Show:</strong> ${escapeHtml(booking.time)}</p>
          <p style="margin:0 0 10px;"><strong>Seats:</strong> ${seats}</p>
          <p style="margin:0;"><strong>Total paid:</strong> Rs ${escapeHtml(booking.total)}</p>
        </div>
        <p style="margin:18px 0 0;color:${brand.muted};">Reference: <strong style="color:${brand.text};">${escapeHtml(booking.ref)}</strong></p>
      `,
      footer:
        "Carry a valid ID if the cinema asks for verification. Ticket, invoice and QR are available inside your movix dashboard.",
    }),
  });
}

async function sendNotificationEmail({
  to,
  subject,
  eyebrow = "movix alerts",
  title,
  preview,
  message,
  actionHref = "",
  actionLabel = "Open movix",
  footer,
}) {
  const action = actionHref
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionHref)}" style="display:inline-block;background:${brand.primary};color:white;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:800;">${escapeHtml(actionLabel)}</a></p>`
    : "";

  return sendEmail({
    to,
    subject,
    html: emailLayout({
      eyebrow,
      title,
      preview: preview || message,
      body: `
        <p style="margin:0;color:#dbeafe;">${escapeHtml(message)}</p>
        ${action}
      `,
      footer,
    }),
  });
}

async function sendOtpEmail(email, otp, options = {}) {
  const purpose = options.purpose ?? "login";
  const templates = {
    login: {
      subject: "Your movix sign-in OTP",
      eyebrow: "Secure sign in",
      title: "Confirm your login",
      preview: "Use this OTP to sign in to movix.",
      text: "Use this one-time password to finish signing in. It expires in 10 minutes.",
    },
    "verify-account": {
      subject: "Verify your movix account",
      eyebrow: "Account verification",
      title: "Verify your email",
      preview: "Use this OTP to verify your movix account.",
      text: "Use this one-time password to verify your new account. It expires in 10 minutes.",
    },
    "password-reset": {
      subject: "Reset your movix password",
      eyebrow: "Password reset",
      title: "Reset your password",
      preview: "Use this OTP to reset your movix password.",
      text: "Use this one-time password on the reset screen and choose a new password. It expires in 10 minutes.",
    },
    ticket: {
      subject: "Verify your ticket email",
      eyebrow: "Ticket OTP",
      title: "Confirm ticket email",
      preview: "Use this OTP to verify your ticket email.",
      text: "Use this one-time password to verify where your ticket and invoice should be sent.",
    },
  };
  const copy = templates[purpose] ?? templates.login;

  return sendEmail({
    to: email,
    subject: copy.subject,
    html: emailLayout({
      eyebrow: copy.eyebrow,
      title: copy.title,
      preview: copy.preview,
      body: `
        <p style="margin:0 0 18px;">${escapeHtml(copy.text)}</p>
        <div style="margin:24px 0;text-align:center;">
          <div style="display:inline-block;letter-spacing:0.42em;background:white;color:#111827;border-radius:16px;padding:18px 22px;font-size:30px;font-weight:900;">${escapeHtml(otp)}</div>
        </div>
        <p style="margin:0;color:${brand.muted};">Never share this code with anyone. movix will never ask for your password or OTP on a phone call.</p>
      `,
      footer: "This OTP expires in 10 minutes. If you did not request it, no action is needed.",
    }),
  });
}

export { sendBookingEmail, sendEmail, sendNotificationEmail, sendOtpEmail };
