import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    movieId: { type: String, required: true, index: true },
    movie: { type: String, default: "" },
    poster: { type: String, default: "" },
    theaterId: { type: String, required: true, index: true },
    theater: { type: String, default: "" },
    screenId: { type: String, required: true },
    screen: { type: String, default: "Screen 1" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    price: {
      platinum: { type: Number, default: 180 },
      silver: { type: Number, default: 220 },
      gold: { type: Number, default: 250 },
      vip: { type: Number, default: 400 },
    },
    language: { type: String, default: "English" },
    format: { type: String, default: "2D" },
    certificate: { type: String, default: "UA" },
    status: { type: String, default: "ok" },
    cancellable: { type: Boolean, default: true },
    listingType: { type: String, enum: ["live", "coming-soon"], default: "live", index: true },
    seats: { type: Number, default: 0 },
    seatLayout: { type: Object, default: {} },
    bookingOpensAt: { type: String, default: "" },
    trailerUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

const Show = mongoose.models.Show || mongoose.model("Show", showSchema);

export { Show };
