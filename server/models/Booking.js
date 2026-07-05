import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: { type: String, default: "" },
    showId: { type: String, required: true, index: true },
    movieId: { type: String, required: true },
    movie: { type: String, required: true },
    theaterId: { type: String, default: "" },
    theater: { type: String, required: true },
    screen: { type: String, default: "Screen 3" },
    time: { type: String, required: true },
    seats: { type: [String], required: true },
    total: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentId: { type: String, default: "" },
    paymentProvider: {
      type: String,
      enum: ["local"],
      default: "local",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
    },
    status: { type: String, enum: ["confirmed", "held", "cancelled"], default: "confirmed" },
    entryVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ showId: 1, seats: 1, status: 1 });

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

export { Booking };
