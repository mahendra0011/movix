import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { notifySubscriptionCreated } from "../services/notificationEvents.js";
import { addSubscriber } from "../services/subscriberStore.js";

const router = Router();

router.post(
  "/subscribe",
  asyncHandler(async (request, response) => {
    const email = await addSubscriber(request.body.email, request.body.source ?? "homepage");
    notifySubscriptionCreated(email).catch((error) =>
      console.warn("Subscription email failed:", error.message),
    );

    response.status(201).json({
      ok: true,
      message: "Subscribed. New movie and trailer alerts will reach your email.",
    });
  }),
);

export { router as notificationRoutes };
