const HTML_TAG = /<[^>]*>/g;

function sanitizeValue(value) {
  if (typeof value === "string") {
    return value.replace(HTML_TAG, "");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    return sanitizeObject(value);
  }
  return value;
}

function sanitizeObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeValue(value);
  }
  return result;
}

function xssSanitize(request, _response, next) {
  if (request.body && typeof request.body === "object") {
    request.body = sanitizeObject(request.body);
  }
  if (request.query && typeof request.query === "object") {
    request.query = sanitizeObject(request.query);
  }
  if (request.params && typeof request.params === "object") {
    request.params = sanitizeObject(request.params);
  }
  next();
}

export { xssSanitize };
