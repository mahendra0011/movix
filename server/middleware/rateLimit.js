function createRateLimiter({
  limit = 120,
  windowMs = 60_000,
  keyPrefix = "default",
  message = "Too many requests. Please try again shortly.",
} = {}) {
  const buckets = new Map();

  return (request, response, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${request.ip || request.socket.remoteAddress || "unknown"}`;
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      response.setHeader("Retry-After", String(retryAfter));
      response.status(429).json({
        error: message,
        requestId: request.id,
      });
      pruneBuckets(buckets, now);
      return;
    }

    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
    response.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    pruneBuckets(buckets, now);
    next();
  };
}

function pruneBuckets(buckets, now) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export { createRateLimiter };
