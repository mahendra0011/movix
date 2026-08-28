import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "../services/cloudinaryService.js";

const ALLOWED_MIME_PREFIXES = ["data:image/", "data:application/octet-stream"];
const MAX_FILE_BYTES = 2.5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_request, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed."));
  },
});

const router = Router();

router.use(requireAuth, requireRole("admin", "theater-owner"));

async function processImage(file, body) {
  if (!file) {
    const error = new Error("Image file is required.");
    error.status = 400;
    throw error;
  }

  const image = await uploadImageToCloudinary(file, {
    folder: body.folder,
    publicId: body.publicId,
    tags: ["movix", body.role].filter(Boolean),
  });

  return image;
}

router.post(
  "/image",
  upload.single("file"),
  asyncHandler(async (request, response) => {
    if (!isCloudinaryConfigured()) {
      response.status(503).json({ error: "Cloudinary is not configured." });
      return;
    }

    if (request.file) {
      const image = await processImage(request.file.buffer.toString("base64"), {
        folder: request.body.folder,
        publicId: request.body.publicId,
        role: request.user?.role || request.auth?.role,
      });
      response.status(201).json({ image });
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

router.use((error, _request, response, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      response.status(400).json({
        error: `File size exceeds the ${Math.round((MAX_FILE_BYTES / 1024 / 1024) * 10) / 10} MB limit.`,
      });
      return;
    }
    response.status(400).json({ error: error.message });
    return;
  }
  next(error);
});

export { router as uploadRoutes };
