import mongoose from "mongoose";

const screenSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, default: "Premium" },
    totalSeats: { type: Number, required: true },
    occupancy: { type: Number, default: 0 },
    seatLayout: { type: Object, default: {} },
  },
  { _id: false },
);

const theaterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    city: { type: String, required: true, index: true },
    address: { type: String, required: true },
    area: { type: String, default: "" },
    distance: { type: String, default: "" },
    amenities: { type: [String], default: [] },
    coverImage: { type: String, default: "" },
    logoText: { type: String, default: "" },
    movieIds: { type: [String], default: [] },
    showPlan: { type: [Object], default: [] },
    contact: { type: String, default: "" },
    manager: { type: String, default: "" },
    cancellationPolicy: { type: String, default: "" },
    foodMenu: { type: [Object], default: [] },
    staff: { type: [Object], default: [] },
    refundCases: { type: [Object], default: [] },
    scanStats: { type: [Object], default: [] },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approved: { type: Boolean, default: true },
    screens: { type: [screenSchema], default: [] },
  },
  { timestamps: true },
);

const Theater = mongoose.models.Theater || mongoose.model("Theater", theaterSchema);

export { Theater };
