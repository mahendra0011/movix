import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { Router } from "express";
import { env } from "../config/env.js";

const router = Router();

function gatewayMode() {
  const wantsRazorpay = env.paymentProvider === "razorpay";
  const razorpayReady = Boolean(env.razorpayKeyId && env.razorpayKeySecret);
  return wantsRazorpay && razorpayReady ? "razorpay" : "local";
}

function localPayment(amount) {
  return {
    id: `local_pay_${Date.now().toString(36)}`,
    provider: "local",
    amount,
    amountMinor: amount * 100,
    currency: "INR",
    status: "requires_confirmation",
  };
}

async function createRazorpayOrder(amount) {
  const amountMinor = Math.round(amount * 100);
  const credentials = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString(
    "base64",
  );
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountMinor,
      currency: "INR",
      receipt: `bms_${Date.now().toString(36)}`,
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Razorpay order failed: ${response.status} ${body}`);
  }

  const order = await response.json();
  return {
    id: order.id,
    orderId: order.id,
    keyId: env.razorpayKeyId,
    provider: "razorpay",
    amount,
    amountMinor,
    currency: order.currency,
    status: "requires_checkout",
  };
}

function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const actual = String(signature ?? "");
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  );
}

router.get("/config", (_request, response) => {
  response.json({
    provider: gatewayMode(),
    razorpayReady: gatewayMode() === "razorpay",
  });
});

router.post("/intent", async (request, response, next) => {
  try {
    const amount = Math.max(0, Number(request.body.amount || 0));
    if (amount <= 0) {
      response.status(400).json({ error: "Payment amount must be greater than zero." });
      return;
    }

    const payment =
      gatewayMode() === "razorpay" ? await createRazorpayOrder(amount) : localPayment(amount);
    response.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
});

router.post("/confirm", (request, response) => {
  const provider = request.body.provider ?? "local";

  if (provider === "razorpay") {
    const { orderId, paymentId, signature } = request.body;
    if (!orderId || !paymentId || !signature || !verifyRazorpaySignature(request.body)) {
      response.status(400).json({ error: "Payment verification failed." });
      return;
    }

    response.json({
      payment: {
        id: paymentId,
        orderId,
        provider: "razorpay",
        status: "paid",
      },
    });
    return;
  }

  response.json({
    payment: {
      id: request.body.paymentId ?? `local_pay_${Date.now().toString(36)}`,
      provider: "local",
      status: "paid",
    },
  });
});

export { router as paymentRoutes };
