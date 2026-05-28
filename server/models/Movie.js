import mongoose from "mongoose";

const castMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    avatar: { type: String, required: true },
  },
  { _id: false },
);

const movieSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    poster: { type: String, required: true },
    backdrop: { type: String, required: true },
    genres: { type: [String], default: [] },
    language: { type: String, required: true },
    duration: { type: String, required: true },
    rating: { type: Number, required: true },
    votes: { type: String, required: true },
    releaseDate: { type: String, required: true },
    description: { type: String, required: true },
    cast: { type: [castMemberSchema], default: [] },
    format: { type: [String], default: [] },
    certificate: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

movieSchema.index(
  { title: "text", genres: "text", language: "text" },
  {
    name: "movie_text_search",
    default_language: "none",
    language_override: "textLanguage",
  },
);

const Movie = mongoose.models.Movie || mongoose.model("Movie", movieSchema);

export { Movie };
