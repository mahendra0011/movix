import crypto from "node:crypto";

function requestContext(request, response, next) {
  const requestId = request.headers["x-request-id"]?.toString().trim() || crypto.randomUUID();
  request.id = requestId;
  response.setHeader("X-Request-Id", requestId);
  next();
}

export { requestContext };
