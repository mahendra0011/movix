import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    movieId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 10 },
    text: { type: String, required: true, maxlength: 1000 },
    tags: { type: [String], default: [] },
    helpfulCount: { type: Number, default: 0 },
    verifiedBooking: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["published", "hidden"],
      default: "published",
      index: true,
    },
    source: {
      type: String,
      enum: ["user", "seed"],
      default: "user",
    },
  },
  { timestamps: true },
);

reviewSchema.index({ movieId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ movieId: 1, status: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export { Review };
