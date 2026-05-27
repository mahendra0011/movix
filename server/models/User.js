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
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export { User };
