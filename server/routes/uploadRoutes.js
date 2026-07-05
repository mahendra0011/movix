import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "../services/cloudinaryService.js";

const ALLOWED_MIME_PREFIXES = ["data:image/", "data:application/octet-stream"];
const MAX_FILE_BYTES = 2.5 * 1024 * 1024;

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

    if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.startsWith(prefix))) {
      response.status(400).json({ error: "Invalid file format. Only image files are allowed." });
      return;
    }

    const rawSize = Math.ceil((file.length * 3) / 4);
    if (rawSize > MAX_FILE_BYTES) {
      response.status(400).json({
        error: `File size exceeds the ${Math.round((MAX_FILE_BYTES / 1024 / 1024) * 10) / 10} MB limit.`,
      });
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
