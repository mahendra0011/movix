const OWNER_APPLICATIONS_KEY = "bms-owner-applications";
const LOCAL_USERS_KEY = "bms-local-auth-users";
const AUTH_USER_KEY = "bms-auth-user";

const ownerStatuses = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function readOwnerApplications() {
  return readJson(OWNER_APPLICATIONS_KEY, []).map(normalizeOwnerApplication);
}

function createOwnerApplication({ user, application, status = ownerStatuses.pending }) {
  const next = normalizeOwnerApplication(
    {
      ...application,
      id:
        application?.id ||
        `owner-app-${slugify(application?.theaterName || user?.name || "cinema")}-${Date.now().toString(36)}`,
      ownerId: user?.id || user?._id || application?.ownerId || "",
      ownerName: user?.name || application?.ownerName || "",
      ownerEmail: user?.email || application?.ownerEmail || "",
      status,
      submittedAt: application?.submittedAt || new Date().toISOString(),
    },
    user,
  );

  const existing = readOwnerApplications();
  const withoutDuplicate = existing.filter(
    (item) => item.id !== next.id && item.ownerEmail !== next.ownerEmail,
  );
  writeOwnerApplications([next, ...withoutDuplicate]);
  return next;
}

function updateOwnerApplicationStatus(id, status, reviewer = "Admin") {
  const normalizedStatus = normalizeOwnerStatus(status);
  let updated = null;
  const nextApplications = readOwnerApplications().map((application) => {
    if (application.id !== id) return application;
    updated = normalizeOwnerApplication({
      ...application,
      status: normalizedStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer,
    });
    return updated;
  });

  writeOwnerApplications(nextApplications);
  if (updated) syncLocalOwnerAccountStatus(updated.ownerEmail, normalizedStatus, updated);
  return updated;
}

function getOwnerApplicationForUser(user) {
  if (!user) return null;
  const applications = readOwnerApplications();
  const email = String(user.email || "").toLowerCase();
  const userId = String(user.id || user._id || "");
  const applicationId = String(user.ownerApplicationId || user.ownerApplication?.id || "");

  const stored =
    applications.find((application) => application.id === applicationId) ||
    applications.find((application) => application.ownerEmail === email) ||
    applications.find((application) => application.ownerId && application.ownerId === userId);

  if (stored) return stored;
  if (user.ownerApplication) {
    return normalizeOwnerApplication({
      ...user.ownerApplication,
      id: applicationId || user.ownerApplication.id,
      ownerId: userId,
      ownerName: user.name,
      ownerEmail: email,
      status: user.ownerStatus || user.ownerApplication.status,
    });
  }

  return null;
}

function getOwnerApprovalForUser(user) {
  if (!user || user.role !== "theater-owner") {
    return { status: ownerStatuses.approved, application: null };
  }

  const application = getOwnerApplicationForUser(user);
  const status = normalizeOwnerStatus(user.ownerStatus || application?.status || "Approved");
  return { status, application };
}

function mapOwnerApplicationForAdmin(application) {
  const normalized = normalizeOwnerApplication(application);
  return {
    id: normalized.id,
    userId: normalized.ownerId,
    name: normalized.theaterName || "Untitled cinema",
    owner: normalized.companyName || normalized.ownerName || "Theater owner",
    ownerEmail: normalized.ownerEmail,
    city: normalized.city,
    area: normalized.area,
    address: normalized.address,
    contact: normalized.contact,
    screens: normalized.screens,
    status: normalized.status,
    documents: normalized.documents || "GST, Fire NOC",
    gstNumber: normalized.gstNumber,
    submittedAt: normalized.submittedAt,
    reviewedAt: normalized.reviewedAt,
    reviewedBy: normalized.reviewedBy,
    source: normalized.source || "local",
  };
}

function syncLocalOwnerAccountStatus(email, status, application) {
  if (typeof window === "undefined" || !email) return;
  const normalizedEmail = String(email).toLowerCase();
  const users = readJson(LOCAL_USERS_KEY, []);
  const updatedUsers = users.map((user) =>
    String(user.email || "").toLowerCase() === normalizedEmail
      ? {
          ...user,
          ownerStatus: normalizeOwnerStatus(status),
          ownerApplicationId: application?.id || user.ownerApplicationId,
          ownerApplication: application || user.ownerApplication,
        }
      : user,
  );
  writeJson(LOCAL_USERS_KEY, updatedUsers);

  const currentUser = readJson(AUTH_USER_KEY, null);
  if (currentUser && String(currentUser.email || "").toLowerCase() === normalizedEmail) {
    writeJson(AUTH_USER_KEY, {
      ...currentUser,
      ownerStatus: normalizeOwnerStatus(status),
      ownerApplicationId: application?.id || currentUser.ownerApplicationId,
      ownerApplication: application || currentUser.ownerApplication,
    });
  }
}

function normalizeOwnerApplication(application = {}, user = {}) {
  const ownerEmail = String(application.ownerEmail || user.email || "")
    .trim()
    .toLowerCase();
  const theaterName = cleanText(application.theaterName || application.name || "");
  const city = cleanText(application.city || "");
  return {
    id: cleanText(application.id) || `owner-app-${slugify(theaterName || ownerEmail || "cinema")}`,
    ownerId: cleanText(application.ownerId || user.id || user._id || ""),
    ownerName: cleanText(application.ownerName || user.name || ""),
    ownerEmail,
    theaterName,
    companyName: cleanText(application.companyName || application.owner || ""),
    city,
    area: cleanText(application.area || ""),
    address: cleanText(application.address || ""),
    contact: cleanText(application.contact || ""),
    screens: Math.max(1, Number(application.screens || 1)),
    gstNumber: cleanText(application.gstNumber || ""),
    documents: cleanText(application.documents || ""),
    message: cleanText(application.message || application.notes || ""),
    status: normalizeOwnerStatus(application.status || "Pending"),
    submittedAt: application.submittedAt || new Date().toISOString(),
    reviewedAt: application.reviewedAt || "",
    reviewedBy: cleanText(application.reviewedBy || ""),
    source: application.source || "local",
  };
}

function normalizeOwnerStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "approved") return ownerStatuses.approved;
  if (value === "rejected") return ownerStatuses.rejected;
  return ownerStatuses.pending;
}

function writeOwnerApplications(applications) {
  writeJson(OWNER_APPLICATIONS_KEY, applications.map(normalizeOwnerApplication));
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return String(value || "cinema")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export {
  createOwnerApplication,
  getOwnerApplicationForUser,
  getOwnerApprovalForUser,
  mapOwnerApplicationForAdmin,
  normalizeOwnerApplication,
  normalizeOwnerStatus,
  ownerStatuses,
  readOwnerApplications,
  syncLocalOwnerAccountStatus,
  updateOwnerApplicationStatus,
};
