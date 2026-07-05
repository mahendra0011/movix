import { Router } from "express";

const router = Router();

router.get("/config", (_request, response) => {
  response.json({ provider: "local" });
});

router.post("/intent", (request, response) => {
  const amount = Math.max(0, Number(request.body.amount || 0));
  if (amount <= 0) {
    response.status(400).json({ error: "Payment amount must be greater than zero." });
    return;
  }

  response.status(201).json({
    payment: {
      id: `local_pay_${Date.now().toString(36)}`,
      provider: "local",
      amount,
      amountMinor: amount * 100,
      currency: "INR",
      status: "requires_confirmation",
    },
  });
});

router.post("/confirm", (request, response) => {
  response.json({
    payment: {
      id: request.body.paymentId ?? `local_pay_${Date.now().toString(36)}`,
      provider: "local",
      status: "paid",
    },
  });
});

export { router as paymentRoutes };
