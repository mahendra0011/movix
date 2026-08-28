import crypto from "node:crypto";
import axios from "axios";
import { env } from "../config/env.js";

const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|webp);base64,/i;
const HTTP_IMAGE_PATTERN = /^https?:\/\//i;
const CLOUDINARY_HOST_PATTERN = /(^|\.)res\.cloudinary\.com$/i;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 45000;
const CLOUDINARY_MAX_RETRIES = 2;

function isCloudinaryConfigured() {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.apiKey && config.apiSecret);
}

function isCloudinaryImageUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return CLOUDINARY_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

async function ensureCloudinaryImageUrl(value, options = {}) {
  const image = String(value || "").trim();
  if (!image || isCloudinaryImageUrl(image)) return image;
  if (!isUploadableImageValue(image)) return image;

  const result = await uploadImageToCloudinary(image, options);
  return result.secureUrl;
}

async function uploadImageToCloudinary(file, options = {}) {
  const image = String(file || "").trim();
  if (!isUploadableImageValue(image)) {
    const error = new Error("Only image files or image URLs can be uploaded.");
    error.status = 400;
    throw error;
  }

  const config = getCloudinaryConfig();
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    const error = new Error("Cloudinary is not configured.");
    error.status = 503;
    throw error;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: sanitizeFolder(options.folder || "movix/uploads"),
    overwrite: "true",
    timestamp: String(timestamp),
  };

  const publicId = sanitizePublicId(options.publicId);
  if (publicId) params.public_id = publicId;
  if (options.tags?.length) params.tags = options.tags.join(",");

  const body = new FormData();
  body.append("file", image);
  body.append("api_key", config.apiKey);
  for (const [key, value] of Object.entries(params)) {
    body.append(key, value);
  }
  body.append("signature", signCloudinaryParams(params, config.apiSecret));

  let response;
  let lastError;

  for (let attempt = 0; attempt <= CLOUDINARY_MAX_RETRIES; attempt++) {
    try {
      response = await axios.post(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        body,
        { timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS },
      );
      break;
    } catch (cause) {
      lastError = cause;
      if (cause.response && cause.response.status >= 400 && cause.response.status < 500) {
        const payload = cause.response.data || {};
        const error = new Error(payload.error?.message || "Cloudinary upload failed.");
        error.status = cause.response.status;
        throw error;
      }
      if (attempt >= CLOUDINARY_MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  if (!response) {
    if (lastError.response) {
      const payload = lastError.response.data || {};
      const error = new Error(payload.error?.message || "Cloudinary upload failed.");
      error.status = lastError.response.status >= 400 && lastError.response.status < 500 ? 400 : 502;
      throw error;
    }
    const error = new Error(
      lastError.code === "ECONNABORTED"
        ? "Cloudinary upload response timed out."
        : "Cloudinary upload failed.",
    );
    error.status = 502;
    throw error;
  }

  return {
    publicId: response.data.public_id,
    secureUrl: response.data.secure_url,
    url: response.data.url,
    width: response.data.width,
    height: response.data.height,
    format: response.data.format,
    bytes: response.data.bytes,
  };
}

function isUploadableImageValue(value) {
  return DATA_IMAGE_PATTERN.test(value) || HTTP_IMAGE_PATTERN.test(value);
}

function getCloudinaryConfig() {
  const parsed = parseCloudinaryUrl(env.cloudinaryUrl);
  return {
    cloudName: env.cloudinaryCloudName || parsed.cloudName,
    apiKey: env.cloudinaryApiKey || parsed.apiKey,
    apiSecret: env.cloudinaryApiSecret || parsed.apiSecret,
  };
}

function parseCloudinaryUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.includes("<your_api_key>") || raw.includes("<your_api_secret>")) {
    return {};
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "cloudinary:") return {};
    return {
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
      cloudName: url.hostname,
    };
  } catch {
    return {};
  }
}

function signCloudinaryParams(params, apiSecret) {
  const signaturePayload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${signaturePayload}${apiSecret}`).digest("hex");
}

function sanitizeFolder(value) {
  return String(value || "movix/uploads")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => sanitizePublicId(part))
    .filter(Boolean)
    .join("/");
}

function sanitizePublicId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

export {
  ensureCloudinaryImageUrl,
  isCloudinaryConfigured,
  isCloudinaryImageUrl,
  uploadImageToCloudinary,
};
