import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "../services/cloudinaryService.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "theater-owner"));

router.post(
  "/image",
  asyncHandler(async (request, response) => {
    if (!isCloudinaryConfigured()) {
      response.status(503).json({ error: "Cloudinary is not configured." });
      return;
    }

    const file = String(request.body.file || "").trim();
    if (!file) {
      response.status(400).json({ error: "Image file is required." });
      return;
    }

    const image = await uploadImageToCloudinary(file, {
      folder: request.body.folder,
      publicId: request.body.publicId,
      tags: ["movix", request.user?.role || request.auth?.role].filter(Boolean),
    });

    response.status(201).json({ image });
  }),
);

export { router as uploadRoutes };
