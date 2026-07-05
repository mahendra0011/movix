import axios from "axios";
import { env } from "../config/env.js";

const brand = {
  name: getBrandName(),
  primary: "#e11d48",
  primaryDark: "#be123c",
  surface: "#fff1f2",
  background: "#f8fafc",
  card: "#ffffff",
  text: "#111827",
  body: "#334155",
  muted: "#64748b",
  border: "#e5e7eb",
};

function getBrandName() {
  const provider = resolveEmailProvider();
  return provider?.fromName || env.emailFromName || "BookMyScreen";
}

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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.background};padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${brand.card};border:1px solid ${brand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.08);">
                <tr>
                  <td style="height:5px;background:linear-gradient(90deg,${brand.primary},#fb7185,#f97316);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:24px 28px;border-bottom:1px solid ${brand.border};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:10px;background:${brand.primary};color:white;text-align:center;font-weight:900;">B</div>
                          <span style="margin-left:10px;color:${brand.text};font-size:19px;font-weight:850;vertical-align:middle;">${escapeHtml(brand.name)}</span>
                        </td>
                        <td align="right" style="color:${brand.muted};font-size:12px;">Secure booking email</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 28px 28px;">
                    <p style="margin:0 0 10px;color:${brand.primaryDark};font-size:12px;font-weight:850;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                    <h1 style="margin:0;color:${brand.text};font-size:28px;line-height:1.18;font-weight:850;">${escapeHtml(title)}</h1>
                    <div style="margin-top:20px;color:${brand.body};font-size:15px;line-height:1.65;">
                      ${body}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid ${brand.border};color:${brand.muted};font-size:12px;line-height:1.6;">
                    ${footer || `This email was sent by ${escapeHtml(brand.name)}. If you did not request it, you can safely ignore it.`}
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

function detailTable(rows) {
  const items = rows
    .filter((row) => row.value !== undefined && row.value !== null && String(row.value).trim())
    .map(
      (row) => `
        <tr>
          <td style="padding:11px 0;color:${brand.muted};font-size:13px;border-bottom:1px solid ${brand.border};">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:11px 0;color:${brand.text};font-size:13px;font-weight:700;border-bottom:1px solid ${brand.border};">${escapeHtml(row.value)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#ffffff;border:1px solid ${brand.border};border-radius:14px;padding:6px 16px;">
      ${items}
    </table>
  `;
}

function noteBox(text) {
  return `
    <div style="margin-top:18px;background:${brand.surface};border:1px solid #fecdd3;border-radius:14px;padding:14px 16px;color:${brand.primaryDark};font-size:13px;line-height:1.55;">
      ${escapeHtml(text)}
    </div>
  `;
}

function otpBlock(otp) {
  return `
    <div style="margin:24px 0;text-align:center;">
      <div style="display:inline-block;letter-spacing:0.36em;background:#ffffff;color:${brand.text};border:1px solid #fecdd3;border-radius:16px;padding:18px 20px;font-size:32px;font-weight:900;box-shadow:0 12px 28px rgba(225,29,72,0.12);">${escapeHtml(otp)}</div>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  if (!to) return { sent: false, reason: "missing-recipient" };

  const provider = resolveEmailProvider();
  if (!provider?.configured) {
    console.log(`[email:provider-not-configured] ${subject} -> ${to}`);
    return { sent: false, reason: provider ? `${provider.id}-not-configured` : "not-configured" };
  }

  return provider.send({ to, subject, html });
}

function resolveEmailProvider() {
  const providers = getEmailProviders();
  if (env.emailProvider && env.emailProvider !== "auto") {
    return providers.find((provider) => provider.id === env.emailProvider);
  }

  return providers.find((provider) => provider.configured);
}

function getEmailProviders() {
  return [
    {
      id: "brevo",
      label: "Brevo",
      configured: Boolean(env.brevoApiKey && env.brevoFromEmail),
      fromName: env.brevoFromName,
      send: sendBrevoEmail,
    },
    {
      id: "resend",
      label: "Resend",
      configured: Boolean(env.resendApiKey && env.resendFromEmail),
      fromName: env.resendFromName,
      send: sendResendEmail,
    },
  ];
}

function getEmailProviderStatus() {
  const provider = resolveEmailProvider();
  if (!provider) {
    return {
      configured: false,
      provider: "",
      label: "Email provider not configured",
    };
  }

  return {
    configured: provider.configured,
    provider: provider.id,
    label: provider.configured
      ? `${provider.label} configured`
      : `${provider.label} provider not configured`,
  };
}

async function sendBrevoEmail({ to, subject, html }) {
  try {
    const response = await axios.post(
      env.brevoApiUrl,
      {
        sender: { email: env.brevoFromEmail, name: env.brevoFromName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": env.brevoApiKey,
          accept: "application/json",
        },
      },
    );

    return { sent: true, provider: "brevo-api", response: response.data };
  } catch (cause) {
    if (cause.response) {
      const error = new Error("Email service failed. Check Brevo API key and sender email.");
      error.status = 502;
      error.cause = new Error(
        `Brevo API email failed: ${cause.response.status} ${JSON.stringify(cause.response.data)}`,
      );
      throw error;
    }
    const error = new Error("Email service failed. Check Brevo API key and sender email.");
    error.status = 502;
    error.cause = cause;
    throw error;
  }
}

async function sendResendEmail({ to, subject, html }) {
  try {
    const response = await axios.post(
      env.resendApiUrl,
      {
        from: formatEmailAddress(env.resendFromEmail, env.resendFromName),
        to: [to],
        subject,
        html,
      },
      {
        headers: {
          authorization: `Bearer ${env.resendApiKey}`,
        },
      },
    );

    return { sent: true, provider: "resend-api", response: response.data };
  } catch (cause) {
    if (cause.response) {
      const error = new Error("Email service failed. Check Resend API key and sender email.");
      error.status = 502;
      error.cause = new Error(
        `Resend API email failed: ${cause.response.status} ${JSON.stringify(cause.response.data)}`,
      );
      throw error;
    }
    const error = new Error("Email service failed. Check Resend API key and sender email.");
    error.status = 502;
    error.cause = cause;
    throw error;
  }
}

function formatEmailAddress(email, name) {
  const safeName = String(name ?? "")
    .replace(/[<>"]/g, "")
    .trim();
  return safeName ? `${safeName} <${email}>` : email;
}

async function sendBookingEmail(booking) {
  if (!booking.email) return { sent: false, reason: "missing-recipient" };

  const seats = (booking.seats ?? []).join(", ");
  return sendEmail({
    to: booking.email,
    subject: `Your ${brand.name} ticket ${booking.ref}`,
    html: emailLayout({
      eyebrow: "Booking confirmed",
      title: `${booking.movie} tickets are ready`,
      preview: `Your ticket ${booking.ref} is confirmed.`,
      body: `
        <p style="margin:0;">Your booking is confirmed. Show this email or the QR/ticket from your dashboard at the cinema entry.</p>
        ${detailTable([
          { label: "Booking reference", value: booking.ref },
          { label: "Movie", value: booking.movie },
          { label: "Theater", value: booking.theater },
          { label: "Screen", value: booking.screen },
          { label: "Showtime", value: booking.time },
          { label: "Seats", value: seats },
          { label: "Total paid", value: `Rs ${booking.total}` },
        ])}
        ${noteBox("Ticket, invoice and QR are available in your dashboard. Please carry a valid ID if the cinema asks for verification.")}
      `,
      footer: "You are receiving this because a ticket was booked with this email address.",
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
        <p style="margin:0;">${escapeHtml(message)}</p>
        ${noteBox("This update is related to your account, booking, or cinema activity.")}
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
      subject: `Your ${brand.name} sign-in OTP`,
      eyebrow: "Secure sign in",
      title: "Confirm your login",
      preview: `Use this OTP to sign in to ${brand.name}.`,
      text: "Use this one-time password to finish signing in.",
      context: "This code was requested from the login screen.",
      nextStep: "Enter the code on the sign-in page to open your account.",
    },
    "verify-account": {
      subject: `Verify your ${brand.name} account`,
      eyebrow: "Account verification",
      title: "Verify your email",
      preview: `Use this OTP to verify your ${brand.name} account.`,
      text: "Welcome. Use this one-time password to verify your new account.",
      context: "This code confirms that this email belongs to you.",
      nextStep: "Enter the code on the verification screen to complete account setup.",
    },
    "password-reset": {
      subject: `Reset your ${brand.name} password`,
      eyebrow: "Password reset",
      title: "Reset your password",
      preview: `Use this OTP to reset your ${brand.name} password.`,
      text: "Use this one-time password to continue with password reset.",
      context: "This code was requested because someone started a password reset.",
      nextStep: "Enter the code on the reset screen, then choose a new password.",
    },
    ticket: {
      subject: "Verify your ticket email",
      eyebrow: "Ticket OTP",
      title: "Confirm ticket email",
      preview: "Use this OTP to verify your ticket email.",
      text: "Use this one-time password to verify where your ticket should be sent.",
      context: "This code was requested from the movie booking page.",
      nextStep:
        "Enter the code in the booking popup. Your ticket and invoice will be emailed here after booking.",
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
        <p style="margin:0;">${escapeHtml(copy.text)}</p>
        ${otpBlock(otp)}
        ${detailTable([
          { label: "Purpose", value: copy.eyebrow },
          { label: "Requested for", value: email },
          { label: "Valid for", value: "10 minutes" },
        ])}
        <p style="margin:0;color:${brand.body};">${escapeHtml(copy.nextStep)}</p>
        ${noteBox(`${copy.context} Never share this code with anyone. ${brand.name} will never ask for your password or OTP on a phone call.`)}
      `,
      footer: "This OTP expires in 10 minutes. If you did not request it, no action is needed.",
    }),
  });
}

export { getEmailProviderStatus, sendBookingEmail, sendEmail, sendNotificationEmail, sendOtpEmail };
