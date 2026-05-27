import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "theater-owner", "admin"],
      default: "user",
      index: true,
    },
    otpHash: { type: String, default: "" },
    otpExpiresAt: { type: Date },
    verified: { type: Boolean, default: false },
    ownerStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved",
      index: true,
    },
    ownerApplication: {
      id: { type: String, default: "" },
      theaterName: { type: String, default: "" },
      companyName: { type: String, default: "" },
      city: { type: String, default: "" },
      area: { type: String, default: "" },
      address: { type: String, default: "" },
      contact: { type: String, default: "" },
      screens: { type: Number, default: 1 },
      gstNumber: { type: String, default: "" },
      documents: { type: String, default: "" },
      message: { type: String, default: "" },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export { User };
