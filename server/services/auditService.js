import { isMongoReady } from "./database.js";
import { AuditLog } from "../models/AuditLog.js";

const memoryLogs = [];

async function logAudit({
  action,
  resource,
  resourceId = "",
  userId = null,
  userEmail = "",
  details = {},
  ip = "",
}) {
  const entry = {
    action,
    resource,
    resourceId,
    userId,
    userEmail,
    details,
    ip,
    timestamp: new Date(),
  };

  memoryLogs.push(entry);
  if (memoryLogs.length > 1000) memoryLogs.shift();

  if (isMongoReady()) {
    try {
      await AuditLog.create(entry);
    } catch {
      // fallback to memory if DB write fails
    }
  }
}

function createAuditMiddleware(action, resource) {
  return (request, response, next) => {
    const originalJson = response.json.bind(response);
    response.json = function (body) {
      if (response.statusCode < 400) {
        const resourceId =
          request.params.id || request.body?.id || body?.booking?.ref || body?.user?._id || "";
        logAudit({
          action,
          resource: resource ?? action.split(".")[0],
          resourceId,
          userId: request.user?._id || null,
          userEmail: request.user?.email || request.body?.email || "",
          details: { method: request.method, path: request.originalUrl },
          ip: request.ip || request.socket?.remoteAddress || "",
        });
      }
      return originalJson(body);
    };
    next();
  };
}

async function getAuditLogs({ action, userId, resource, resourceId, limit = 100, skip = 0 } = {}) {
  if (isMongoReady()) {
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (resource) filter.resource = resource;
    if (resourceId) filter.resourceId = resourceId;

    return AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
  }

  let results = [...memoryLogs].reverse();
  if (action) results = results.filter((l) => l.action === action);
  if (userId) results = results.filter((l) => String(l.userId) === String(userId));
  if (resource) results = results.filter((l) => l.resource === resource);
  if (resourceId) results = results.filter((l) => l.resourceId === resourceId);
  return results.slice(skip, skip + limit);
}

export { getAuditLogs, logAudit, createAuditMiddleware };
