import crypto from "node:crypto";
import { env } from "../config/env.js";

const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|webp);base64,/i;
const HTTP_IMAGE_PATTERN = /^https?:\/\//i;
const CLOUDINARY_HOST_PATTERN = /(^|\.)res\.cloudinary\.com$/i;
const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;

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
    folder: sanitizeFolder(options.folder || "bookmyscreen/uploads"),
    overwrite: "true",
    timestamp: String(timestamp),
  };

  const publicId = sanitizePublicId(options.publicId);
  if (publicId) params.public_id = publicId;
  if (options.tags?.length) params.tags = options.tags.join(",");

  const uploadFile = HTTP_IMAGE_PATTERN.test(image) ? await fetchImageAsDataUri(image) : image;
  const body = new FormData();
  body.append("file", uploadFile);
  body.append("api_key", config.apiKey);
  for (const [key, value] of Object.entries(params)) {
    body.append(key, value);
  }
  body.append("signature", signCloudinaryParams(params, config.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error?.message || "Cloudinary upload failed.");
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  return {
    publicId: payload.public_id,
    secureUrl: payload.secure_url,
    url: payload.url,
    width: payload.width,
    height: payload.height,
    format: payload.format,
    bytes: payload.bytes,
  };
}

function isUploadableImageValue(value) {
  return DATA_IMAGE_PATTERN.test(value) || HTTP_IMAGE_PATTERN.test(value);
}

async function fetchImageAsDataUri(url) {
  const response = await fetchWithRetry(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "BookMyScreenImageMigration/1.0",
    },
  });
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
  if (!contentType.startsWith("image/")) {
    const error = new Error("Remote URL is not an image.");
    error.status = 400;
    throw error;
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
    const error = new Error("Remote image is too large.");
    error.status = 400;
    throw error;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    const error = new Error("Remote image is too large.");
    error.status = 400;
    throw error;
  }

  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

async function fetchWithRetry(url, init) {
  const delays = [0, 1500, 4000, 8000];
  let lastResponse;
  for (const delayMs of delays) {
    if (delayMs) await wait(delayMs);
    lastResponse = await fetch(url, init).catch((error) => {
      const wrapped = new Error(`Image fetch failed: ${error.message}`);
      wrapped.status = 502;
      throw wrapped;
    });
    if (lastResponse.ok) return lastResponse;
    if (![408, 425, 429, 500, 502, 503, 504].includes(lastResponse.status)) break;
  }

  const error = new Error(`Image fetch failed with ${lastResponse?.status || "unknown"} status.`);
  error.status = lastResponse?.status === 429 ? 429 : 400;
  throw error;
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
  return String(value || "bookmyscreen/uploads")
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

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export {
  ensureCloudinaryImageUrl,
  isCloudinaryConfigured,
  isCloudinaryImageUrl,
  uploadImageToCloudinary,
};
