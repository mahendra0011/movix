import { Router } from "express";

const router = Router();

router.post("/mock-intent", (request, response) => {
  const amount = Number(request.body.amount || 0);
  response.status(201).json({
    payment: {
      id: `mock_pay_${Date.now().toString(36)}`,
      provider: "mock",
      amount,
      currency: "INR",
      status: "requires_confirmation",
    },
  });
});

router.post("/mock-confirm", (request, response) => {
  response.json({
    payment: {
      id: request.body.paymentId ?? `mock_pay_${Date.now().toString(36)}`,
      provider: "mock",
      status: "paid",
    },
  });
});

export { router as paymentRoutes };
