import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    movieId: { type: String, required: true, index: true },
    theaterId: { type: String, required: true, index: true },
    screenId: { type: String, required: true },
    screen: { type: String, default: "Screen 1" },
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
    status: { type: String, default: "ok" },
    cancellable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Show = mongoose.models.Show || mongoose.model("Show", showSchema);

export { Show };
