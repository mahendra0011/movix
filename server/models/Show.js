import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    movieId: { type: String, required: true, index: true },
    theaterId: { type: String, required: true, index: true },
    screenId: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    price: {
      platinum: { type: Number, default: 180 },
      gold: { type: Number, default: 250 },
      vip: { type: Number, default: 400 },
    },
    language: { type: String, default: "English" },
    format: { type: String, default: "2D" },
  },
  { timestamps: true },
);

const Show = mongoose.models.Show || mongoose.model("Show", showSchema);

export { Show };
