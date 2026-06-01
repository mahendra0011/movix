import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Booking } from "../models/Booking.js";
import { Movie } from "../models/Movie.js";
import { Review } from "../models/Review.js";
import { Show } from "../models/Show.js";
import { buildSeedReviews, REVIEW_TAGS } from "../data/reviewSeeds.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { getMemoryBookings } from "../services/bookingStore.js";
import { ensureCloudinaryImageUrl } from "../services/cloudinaryService.js";
import { notifyMovieRelease } from "../services/notificationEvents.js";
import { movies } from "../../src/features/movies/data/movieCatalog.js";
import {
  isFallbackMovieArtwork,
  isGeneratedImageUrl,
  normalizeCastImageUrl,
  normalizeMovieImageUrl,
} from "../../src/features/movies/services/movieMedia.js";

const router = Router();
const memoryReviews = buildSeedReviews(movies.map((movie) => movie.id)).map((review, index) => ({
  ...review,
  id: `memory-review-${index + 1}`,
  createdAt: new Date(Date.now() - (index + 1) * 36 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - (index + 1) * 36 * 60 * 60 * 1000).toISOString(),
}));
const catalogMovieIds = movies.map((movie) => movie.id);
const catalogMovieIdSet = new Set(catalogMovieIds);
const catalogMovieById = new Map(movies.map((movie) => [movie.id, movie]));

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toList(value, fallback = []) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return items.length ? items : fallback;
}

function normalizeMovie(input) {
  const title = String(input.title ?? "").trim();
  if (!title) {
    const error = new Error("Movie title is required.");
    error.status = 400;
    throw error;
  }

  const baseMovie = movies[0] ?? {};
  const id = slugify(input.id || title);
  const poster = normalizeMovieImageUrl(input.poster || baseMovie.poster, title, "poster");
  const backdrop = normalizeMovieImageUrl(
    input.backdrop || input.poster || baseMovie.backdrop,
    title,
    "backdrop",
    poster,
  );

  return {
    id,
    title,
    poster,
    backdrop,
    genres: toList(input.genres, ["Drama"]),
    language: String(input.language ?? "English").trim() || "English",
    duration: String(input.duration ?? "2h 10m").trim() || "2h 10m",
    rating: Number(input.rating) || 8.1,
    votes: String(input.votes ?? "New"),
    releaseDate: String(input.releaseDate ?? "Coming soon"),
    description:
      String(input.description ?? "").trim() ||
      `${title} is ready for publishing after poster, cast and show scheduling review.`,
    cast: normalizeCastInput(input.cast),
    format: toList(input.format, ["2D"]),
    certificate: String(input.certificate ?? "UA").trim() || "UA",
    sortOrder: Number(input.sortOrder) || Date.now(),
  };
}

function normalizeCastInput(cast = []) {
  if (!Array.isArray(cast)) return [];
  return cast
    .map((member) => {
      const name = String(member?.name ?? "").trim();
      if (!name) return null;
      return {
        name,
        role: String(member?.role ?? "Actor").trim() || "Actor",
        avatar: normalizeCastImageUrl(member?.avatar, name),
      };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function getMemoryMovies(query = "") {
  const needle = query.trim().toLowerCase();
  if (!needle) return movies;
  return movies.filter((movie) => {
    const haystack = [movie.title, movie.language, ...movie.genres].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

async function findMovieById(id) {
  if (!isMongoReady()) return movies.find((item) => item.id === id) ?? null;

  if (catalogMovieIdSet.has(id)) {
    const movie = cleanDocument(await Movie.findOne({ id }).lean());
    if (movie) return mergeCatalogMovieMedia(movie);
  }

  const shows = await Show.find({
    movieId: id,
    ownerId: { $exists: true, $ne: null },
    listingType: { $ne: "coming-soon" },
  }).lean();
  const show = shows.find(isPublicLiveShow);
  return show ? mergeCatalogMovieMedia(mapShowMovie(show)) : null;
}

async function getLiveShowMovies() {
  const shows = await Show.find({
    ownerId: { $exists: true, $ne: null },
    listingType: { $ne: "coming-soon" },
  })
    .limit(1000)
    .lean();
  return mergeMovieLists(
    shows.filter(isPublicLiveShow).map(mapShowMovie).map(mergeCatalogMovieMedia),
  );
}

function isPublicLiveShow(show) {
  if (!show) return false;
  const status = String(show.status || "")
    .trim()
    .toLowerCase();
  return show.listingType !== "coming-soon" && status !== "draft" && status !== "coming soon";
}

function mapShowMovie(show) {
  const title = show.movie || show.movieId || "Movie";
  const poster = normalizeMovieImageUrl(show.poster, title, "poster");
  const backdrop = normalizeMovieImageUrl(show.backdrop || show.poster, title, "backdrop", poster);
  return {
    id: show.movieId || slugify(title),
    title,
    poster,
    backdrop,
    genres: toList(show.genres, ["Drama"]),
    language: show.language || "English",
    duration: show.duration || "2h 10m",
    rating: Number(show.rating || 8.1),
    votes: show.votes || "New",
    releaseDate: show.releaseDate || "Now showing",
    description:
      show.description ||
      `${title} is now showing at selected movix cinemas with live booking slots.`,
    cast: normalizeCastInput(show.cast),
    format: toList(show.format, ["2D"]),
    certificate: show.certificate || "UA",
    listingType: "live",
    releaseStatus: "released",
    sortOrder: Number(show.sortOrder || Date.now()),
  };
}

function mergeCatalogMovieMedia(movie) {
  if (!movie?.id) return movie;
  const catalogMovie = catalogMovieById.get(movie.id);
  if (!catalogMovie) return movie;

  const title = movie.title || catalogMovie.title || "Movie";
  const poster = normalizeMovieImageUrl(movie.poster || catalogMovie.poster, title, "poster");
  const backdrop = normalizeMovieImageUrl(
    movie.backdrop || movie.poster || catalogMovie.backdrop,
    title,
    "backdrop",
    poster,
  );
  const catalogPoster = normalizeMovieImageUrl(catalogMovie.poster, title, "poster");
  const catalogBackdrop = normalizeMovieImageUrl(
    catalogMovie.backdrop,
    title,
    "backdrop",
    catalogPoster,
  );
  const cast = normalizeCastInput(movie.cast);
  const catalogCast = normalizeCastInput(catalogMovie.cast);
  const bestCast = selectBestMovieCast(cast, catalogCast);

  return {
    ...catalogMovie,
    ...movie,
    poster: isFallbackMovieArtwork(poster) ? catalogPoster : poster,
    backdrop: isFallbackMovieArtwork(backdrop) ? catalogBackdrop : backdrop,
    cast: bestCast,
  };
}

function selectBestMovieCast(movieCast = [], catalogCast = []) {
  const movieVisibleCast = movieCast.slice(0, 6);
  const catalogVisibleCast = catalogCast.slice(0, 6);
  const movieRealCount = movieVisibleCast.filter(hasRealCastAvatar).length;
  const catalogRealCount = catalogVisibleCast.filter(hasRealCastAvatar).length;

  if (!movieVisibleCast.length) return catalogVisibleCast;
  if (!catalogVisibleCast.length) return movieVisibleCast;
  if (catalogRealCount >= 4 && catalogRealCount >= movieRealCount - 1) {
    return catalogVisibleCast;
  }
  return catalogRealCount > movieRealCount ? catalogVisibleCast : movieVisibleCast;
}

function hasRealCastAvatar(member) {
  const avatar = String(member?.avatar ?? "");
  return avatar.startsWith("https://res.cloudinary.com/") && !isGeneratedImageUrl(avatar);
}

function mergeMovieLists(...lists) {
  const byId = new Map();
  lists.flat().forEach((movie) => {
    if (!movie?.id || movie.listingType === "coming-soon") return;
    byId.set(movie.id, { ...(byId.get(movie.id) ?? {}), ...movie });
  });
  return [...byId.values()];
}

function filterMovieList(list, { query = "", genre = "", language = "" } = {}) {
  const needle = query.trim().toLowerCase();
  return list.filter((movie) => {
    const genreMatch = !genre || genre === "All" || toList(movie.genres).includes(genre);
    const languageMatch = !language || language === "All" || movie.language === language;
    const haystack = [movie.title, movie.language, ...(movie.genres ?? [])].join(" ").toLowerCase();
    return genreMatch && languageMatch && (!needle || haystack.includes(needle));
  });
}

function normalizeReviewInput(input = {}) {
  const rating = Math.round(Number(input.rating));
  const text = String(input.text ?? "").trim();
  const tags = toList(input.tags, []).map(normalizeReviewTag).filter(Boolean).slice(0, 5);

  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    const error = new Error("Rating must be between 1 and 10.");
    error.status = 400;
    throw error;
  }

  if (text.length < 10) {
    const error = new Error("Review must be at least 10 characters.");
    error.status = 400;
    throw error;
  }

  return {
    rating,
    text: text.slice(0, 1000),
    tags,
  };
}

function normalizeReviewTag(tag) {
  const value = String(tag ?? "")
    .trim()
    .replace(/\s+/g, "");
  if (!value) return "";
  return value.startsWith("#") ? value : `#${value}`;
}

async function hasVerifiedBooking({ email, userId, movie }) {
  if (!movie) return false;
  const normalizedEmail = normalizeEmail(email);

  if (isMongoReady()) {
    const filter = {
      movieId: movie.id,
      status: { $ne: "cancelled" },
      $or: [{ email: normalizedEmail }],
    };
    if (userId) filter.$or.push({ userId });
    return Boolean(await Booking.exists(filter));
  }

  return getMemoryBookings().some((booking) => {
    const bookingEmail = normalizeEmail(booking.email);
    const movieMatches = booking.movieId === movie.id || booking.movie === movie.title;
    const userMatches = bookingEmail && bookingEmail === normalizedEmail;
    return movieMatches && userMatches && booking.status !== "cancelled";
  });
}

async function buildReviewsPayload(movieId, viewerUserId = "") {
  if (isMongoReady()) {
    const [reviewDocs, aggregateRows, tagRows, viewerReview] = await Promise.all([
      Review.find({ movieId, status: "published" }).sort({ createdAt: -1 }).limit(8).lean(),
      Review.aggregate([
        { $match: { movieId, status: "published" } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { movieId, status: "published", tags: { $ne: [] } } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      viewerUserId
        ? Review.findOne({ movieId, userId: viewerUserId, status: "published" }).lean()
        : null,
    ]);
    const aggregate = aggregateRows[0] ?? { average: 0, count: 0 };
    return {
      reviews: reviewDocs.map(mapReview),
      summary: mapReviewSummary(aggregate),
      topTags: mapTopTags(tagRows),
      userReview: viewerReview ? mapReview(viewerReview) : null,
    };
  }

  const visibleReviews = memoryReviews
    .filter((review) => review.movieId === movieId && review.status === "published")
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const viewerReview = viewerUserId
    ? visibleReviews.find((review) => review.userId === viewerUserId)
    : null;
  return {
    reviews: visibleReviews.slice(0, 8).map(mapReview),
    summary: mapReviewSummary({
      average: averageRating(visibleReviews),
      count: visibleReviews.length,
    }),
    topTags: mapTopTagsFromReviews(visibleReviews),
    userReview: viewerReview ? mapReview(viewerReview) : null,
  };
}

function mapReview(document) {
  const review = cleanDocument(document);
  return {
    id: String(review.id ?? review._id ?? `${review.movieId}-${review.userId}`),
    movieId: review.movieId,
    name: review.userName,
    userName: review.userName,
    rating: Number(review.rating || 0),
    ratingLabel: `${Number(review.rating || 0)}/10`,
    tags: Array.isArray(review.tags) ? review.tags : [],
    text: review.text,
    helpfulCount: Number(review.helpfulCount || 0),
    verifiedBooking: Boolean(review.verifiedBooking),
    status: review.status || "published",
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

function mapReviewSummary(aggregate) {
  const count = Number(aggregate.count || 0);
  const average = count ? Number(Number(aggregate.average || 0).toFixed(1)) : 0;
  return {
    average,
    count,
    countLabel: formatReviewCount(count),
  };
}

function mapTopTags(rows) {
  const tags = rows.map((row) => ({ tag: row._id, count: row.count }));
  return tags.length ? tags : REVIEW_TAGS.map(([tag, count]) => ({ tag, count }));
}

function mapTopTagsFromReviews(reviews) {
  const counts = reviews.reduce((acc, review) => {
    (review.tags ?? []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});
  const tags = Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count);
  return tags.length ? tags : REVIEW_TAGS.map(([tag, count]) => ({ tag, count }));
}

function averageRating(reviews) {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Number((total / reviews.length).toFixed(1));
}

function formatReviewCount(count) {
  if (count >= 1000000) return `${trimNumber(count / 1000000)}M reviews`;
  if (count >= 1000) return `${trimNumber(count / 1000)}K reviews`;
  return `${count} ${count === 1 ? "review" : "reviews"}`;
}

function trimNumber(value) {
  return Number(value.toFixed(1)).toString();
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function emailName(email) {
  const [name] = String(email || "").split("@");
  return name || "User";
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const query = String(request.query.q ?? "");
    const genre = String(request.query.genre ?? "");
    const language = String(request.query.language ?? "");

    let list;
    if (!isMongoReady()) {
      list = getMemoryMovies(query);
    } else {
      const filter = catalogMovieIds.length ? { id: { $in: catalogMovieIds } } : { id: "__none" };
      if (query) {
        filter.$or = [
          { $text: { $search: query } },
          { title: new RegExp(query, "i") },
          { genres: new RegExp(query, "i") },
          { language: new RegExp(query, "i") },
        ];
      }
      if (genre && genre !== "All") filter.genres = genre;
      if (language && language !== "All") filter.language = language;
      const catalogList = (await Movie.find(filter).sort({ sortOrder: 1 }).lean()).map(
        cleanDocument,
      );
      const showMovies = await getLiveShowMovies();
      list = mergeMovieLists(catalogList.map(mergeCatalogMovieMedia), showMovies);
    }

    list = filterMovieList(list, { query, genre, language });

    const payload = { movies: list };
    response.json(payload);
  }),
);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (request, response) => {
    const payload = normalizeMovie(request.body);
    await ensureMovieUsesCloudinary(payload);

    if (isMongoReady()) {
      const exists = await Movie.findOne({ id: payload.id }).lean();
      if (exists) {
        response.status(409).json({ error: "Movie already exists." });
        return;
      }

      const movie = cleanDocument(await Movie.create(payload));
      await notifyMovieRelease(movie);
      response.status(201).json({ movie });
      return;
    }

    if (movies.some((movie) => movie.id === payload.id)) {
      response.status(409).json({ error: "Movie already exists." });
      return;
    }

    movies.unshift(payload);
    await notifyMovieRelease(payload);
    response.status(201).json({ movie: payload });
  }),
);

async function ensureMovieUsesCloudinary(movie) {
  const folder = `movix/admin/movies/${slugify(movie.id || movie.title)}`;
  movie.poster = await ensureCloudinaryImageUrl(movie.poster, {
    folder,
    publicId: `${movie.id}-poster`,
  });
  movie.backdrop = await ensureCloudinaryImageUrl(movie.backdrop, {
    folder,
    publicId: `${movie.id}-backdrop`,
  });
  movie.cast = await Promise.all(
    (movie.cast || []).map(async (member, index) => ({
      ...member,
      avatar: await ensureCloudinaryImageUrl(member.avatar, {
        folder: `${folder}/cast`,
        publicId: `${movie.id}-cast-${index + 1}`,
      }),
    })),
  );
}

router.get(
  "/:id/reviews",
  asyncHandler(async (request, response) => {
    const movie = await findMovieById(request.params.id);
    if (!movie) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    response.json(await buildReviewsPayload(movie.id));
  }),
);

router.post(
  "/:id/reviews",
  requireAuth,
  asyncHandler(async (request, response) => {
    const movie = await findMovieById(request.params.id);
    if (!movie) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    if (request.user?.blocked || request.user?.status === "Blocked") {
      response.status(403).json({ error: "This account is blocked by admin." });
      return;
    }

    const input = normalizeReviewInput(request.body);
    const userId = String(request.user?.id ?? request.user?._id ?? request.auth?.sub ?? "");
    const userEmail = normalizeEmail(request.user?.email ?? request.auth?.email);
    const userName = request.user?.name || emailName(userEmail);
    if (!userId || !userEmail) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    const verifiedBooking = await hasVerifiedBooking({ email: userEmail, userId, movie });
    const payload = {
      movieId: movie.id,
      userId,
      userEmail,
      userName,
      rating: input.rating,
      text: input.text,
      tags: input.tags,
      verifiedBooking,
      status: "published",
      source: "user",
    };

    if (isMongoReady()) {
      const exists = await Review.exists({ movieId: movie.id, userId });
      await Review.findOneAndUpdate(
        { movieId: movie.id, userId },
        { $set: payload },
        { new: true, runValidators: true, setDefaultsOnInsert: true, upsert: true },
      );
      response.status(exists ? 200 : 201).json(await buildReviewsPayload(movie.id, userId));
      return;
    }

    const reviewIndex = memoryReviews.findIndex(
      (review) => review.movieId === movie.id && review.userId === userId,
    );
    const timestamp = new Date().toISOString();
    if (reviewIndex >= 0) {
      memoryReviews[reviewIndex] = {
        ...memoryReviews[reviewIndex],
        ...payload,
        updatedAt: timestamp,
      };
    } else {
      memoryReviews.unshift({
        ...payload,
        id: `memory-review-${Date.now().toString(36)}`,
        helpfulCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    response.status(reviewIndex >= 0 ? 200 : 201).json(await buildReviewsPayload(movie.id, userId));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    const movie = await findMovieById(id);

    if (!movie) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    response.json({ movie });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (request, response) => {
    const { id } = request.params;

    if (isMongoReady()) {
      const movie = await Movie.findOneAndDelete({ id }).lean();
      if (!movie) {
        response.status(404).json({ error: "Movie not found" });
        return;
      }

      await Review.deleteMany({ movieId: id });
      response.json({ ok: true, movie: cleanDocument(movie) });
      return;
    }

    const index = movies.findIndex((movie) => movie.id === id);
    if (index === -1) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    const [movie] = movies.splice(index, 1);
    for (let reviewIndex = memoryReviews.length - 1; reviewIndex >= 0; reviewIndex -= 1) {
      if (memoryReviews[reviewIndex].movieId === id) memoryReviews.splice(reviewIndex, 1);
    }
    response.json({ ok: true, movie });
  }),
);

router.get(
  "/:id/ai-summary",
  asyncHandler(async (request, response) => {
    const movie = await findMovieById(request.params.id);

    if (!movie) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    response.json({
      summary: `${movie.title} is a ${movie.genres.slice(0, 2).join(" and ")} pick with ${movie.language} audio, ${movie.duration} runtime, and a ${movie.rating}/10 audience score. Best for viewers who want ${movie.description.toLowerCase()}`,
    });
  }),
);

export { router as movieRoutes };
