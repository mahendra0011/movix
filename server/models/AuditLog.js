import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "user.block",
        "user.unblock",
        "user.role.change",
        "owner.approve",
        "owner.reject",
        "owner.remove",
        "booking.create",
        "booking.cancel",
        "booking.refund",
        "booking.confirm",
        "movie.create",
        "movie.update",
        "movie.delete",
        "show.create",
        "show.update",
        "show.delete",
        "theater.create",
        "theater.update",
        "theater.delete",
        "admin.login",
        "system",
      ],
    },
    resource: { type: String, required: true },
    resourceId: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export { AuditLog };
