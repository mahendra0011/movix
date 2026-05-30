import { Router } from "express";
import { Show } from "../models/Show.js";
import { Theater } from "../models/Theater.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { isMongoReady } from "../services/database.js";
import {
  comingSoonMovies,
  movies as catalogMovies,
  showTimes,
  theaters as catalogTheaters,
} from "../../src/features/movies/data/movieCatalog.js";
import {
  buildCatalogShow,
  getCatalogTheaterPlans,
  splitCatalogList,
  theaterHasMovie,
} from "../../src/features/movies/services/showSchedule.js";
import {
  isFallbackMovieArtwork,
  isGeneratedImageUrl,
  normalizeCastImageUrl,
  normalizeMovieImageUrl,
} from "../../src/features/movies/services/movieMedia.js";

const router = Router();
const catalogMovieIds = catalogMovies.map((movie) => movie.id);
const catalogMovieIdSet = new Set(catalogMovieIds);
const catalogMovieById = new Map(catalogMovies.map((movie) => [movie.id, movie]));
const comingSoonMovieById = new Map(comingSoonMovies.map((movie) => [movie.id, movie]));
const comingSoonTitleCorrections = new Map(
  [
    ["Madhuri Dixit & Tripti Dimri Film", "Maa Behen"],
    ["Madhuri Dixit & Triptii Dimri Film", "Maa Behen"],
    ["Bobby Deol Film", "Bandar"],
    ["Varun Dhawan & Pooja Hegde Film", "Hai Jawani Toh Ishq Hona Hai"],
    ["Diljit Dosanjh & Sharvari Film", "Main Vaapas Aaunga"],
    ["Manoj Bajpayee & Adah Sharma Film", "Governor: The Silent Saviour"],
    ["Anurag Kashyap Film", "Bandar"],
    ["Shahid Kapoor & Rashmika Mandanna Film", "Cocktail 2"],
    ["Satya Dev Film", "Rao Bahadur"],
    ["Naga Chaitanya & Meenakshi Chaudhary Film", "Vrushakarma"],
    ["Fahadh Faasil Film", "Don't Trouble The Trouble"],
    ["Fahadh Faasil Telugu Film", "Don't Trouble The Trouble"],
    ["Ashok Galla Film", "VISA - Vintara Saradaga"],
  ].flatMap(([from, to]) => [
    [normalizeText(from), to],
    [slugify(from), to],
  ]),
);

function generatedShows(movieId, city = "", activeDate = "") {
  if (!catalogMovieIdSet.has(movieId)) return [];
  const cityFilter = String(city ?? "")
    .trim()
    .toLowerCase();
  const movie = catalogMovieById.get(movieId);
  return catalogTheaters
    .filter(
      (theater) =>
        (!cityFilter || theater.city?.toLowerCase() === cityFilter) &&
        theaterHasMovie(theater, movieId),
    )
    .flatMap((theater) =>
      getCatalogTheaterPlans(theater, showTimes).map((plan, index) =>
        formatGeneratedShow({ movie, theater, plan, index, activeDate }),
      ),
    );
}

function generatedTheaterShows({ theaterId = "", city = "", activeDate = "" } = {}) {
  const cityFilter = String(city ?? "")
    .trim()
    .toLowerCase();
  const theaterFilter = String(theaterId ?? "").trim();
  return catalogTheaters
    .filter(
      (theater) =>
        (!theaterFilter || theater.id === theaterFilter) &&
        (!cityFilter || theater.city?.toLowerCase() === cityFilter),
    )
    .flatMap((theater) => {
      const listedMovieIds = splitCatalogList(theater.movieIds);
      const movieIds = listedMovieIds.length
        ? listedMovieIds
        : catalogMovies.map((movie) => movie.id);
      return movieIds.flatMap((movieId) => {
        const movie = catalogMovies.find((item) => item.id === movieId);
        if (!movie) return [];
        return getCatalogTheaterPlans(theater, showTimes).map((plan, index) =>
          formatGeneratedShow({ movie, theater, plan, index, activeDate }),
        );
      });
    });
}

function formatGeneratedShow({ movie, theater, plan, index, activeDate }) {
  const show = buildCatalogShow({ movie, theater, plan, index, activeDate, showTimes });
  return {
    id: show.id,
    movieId: movie.id,
    movie: movie.title || movie.id,
    poster: movie.poster || "",
    duration: movie.duration || "",
    genres: movie.genres ?? [],
    certificate: movie.certificate || "UA",
    theaterId: theater.id,
    theater: theater.name,
    city: theater.city || "Bengaluru",
    area: theater.area,
    address: theater.address,
    amenities: theater.amenities ?? [],
    logoText: theater.logoText,
    screenId: `${theater.id}-${slugify(show.screen || "screen-1")}`,
    screen: show.screen,
    startTime: show.label,
    endTime: "Auto calculated",
    format: show.format,
    language: show.language,
    price: show.price,
    seatLayout: show.seatLayout,
    status: show.status,
    cancellable: show.cancellable,
  };
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const theaterId = String(request.query.theaterId ?? "").trim();
    const city = String(request.query.city ?? "").trim();
    const date = String(request.query.date ?? "").trim();

    if (!isMongoReady()) {
      response.json({ shows: generatedTheaterShows({ theaterId, city, activeDate: date }) });
      return;
    }

    const showFilter = ownerScopedShowFilter({ listingType: { $ne: "coming-soon" } });
    if (catalogMovieIds.length) {
      showFilter.$or.push({ movieId: { $in: catalogMovieIds } });
    }
    if (theaterId) showFilter.theaterId = theaterId;

    const shows = await Show.find(showFilter).limit(1500).lean();
    const visibleShows = shows.filter((show) => isPublicShow(show) && matchesShowDate(show, date));
    const theaterIds = [...new Set(visibleShows.map((show) => show.theaterId).filter(Boolean))];
    const theaterFilter = { id: { $in: theaterIds }, approved: true };
    if (city) theaterFilter.city = new RegExp(`^${escapeRegExp(city)}$`, "i");

    const theaters = await Theater.find(theaterFilter).lean();
    const theaterById = new Map(theaters.map((theater) => [theater.id, theater]));
    const rows = visibleShows
      .map((show, index) => formatMongoShow(show, theaterById.get(show.theaterId), index, date))
      .filter(Boolean);

    response.json({ shows: rows });
  }),
);

router.get(
  "/coming-soon",
  asyncHandler(async (request, response) => {
    const city = String(request.query.city ?? "").trim();

    if (!isMongoReady()) {
      response.json({ movies: generatedComingSoonMovies(city) });
      return;
    }

    const shows = await Show.find(ownerScopedShowFilter({ listingType: "coming-soon" })).lean();
    const theaterIds = [...new Set(shows.map((show) => show.theaterId).filter(Boolean))];
    const theaterFilter = { id: { $in: theaterIds }, approved: true };
    if (city) theaterFilter.city = new RegExp(`^${escapeRegExp(city)}$`, "i");

    const theaters = await Theater.find(theaterFilter).lean();
    const theaterById = new Map(theaters.map((theater) => [theater.id, theater]));

    response.json({
      movies: mergeComingSoonMovies(
        generatedComingSoonMovies(city),
        groupComingSoonShows(shows, theaterById),
      ),
    });
  }),
);

router.get(
  "/coming-soon/:movieId",
  asyncHandler(async (request, response) => {
    const city = String(request.query.city ?? "").trim();
    const movie = await findComingSoonMovie(request.params.movieId, city);

    if (!movie) {
      response.status(404).json({ error: "Coming soon movie not found" });
      return;
    }

    response.json({ movie });
  }),
);

router.get(
  "/:movieId",
  asyncHandler(async (request, response) => {
    if (!isMongoReady()) {
      response.json({
        shows: generatedShows(request.params.movieId, request.query.city, request.query.date),
      });
      return;
    }

    const city = String(request.query.city ?? "").trim();
    const date = String(request.query.date ?? "").trim();
    const showFilter = catalogMovieIdSet.has(request.params.movieId)
      ? { movieId: request.params.movieId }
      : ownerScopedShowFilter({ movieId: request.params.movieId });
    const shows = await Show.find(showFilter).sort({ startTime: 1 }).lean();
    const visibleShows = shows.filter((show) => isPublicShow(show) && matchesShowDate(show, date));
    const theaterIds = [...new Set(visibleShows.map((show) => show.theaterId).filter(Boolean))];
    const theaterFilter = { id: { $in: theaterIds }, approved: true };
    if (city) theaterFilter.city = new RegExp(`^${escapeRegExp(city)}$`, "i");

    const theaters = await Theater.find(theaterFilter).lean();
    const theaterById = new Map(theaters.map((theater) => [theater.id, theater]));
    const rows = visibleShows
      .map((show, index) => formatMongoShow(show, theaterById.get(show.theaterId), index, date))
      .filter(Boolean);

    response.json({ shows: rows });
  }),
);

async function findComingSoonMovie(movieId, city = "") {
  const key = normalizeComingSoonLookupKey(movieId);
  let movies = generatedComingSoonMovies(city);

  if (isMongoReady()) {
    const shows = await Show.find(ownerScopedShowFilter({ listingType: "coming-soon" })).lean();
    const theaterIds = [...new Set(shows.map((show) => show.theaterId).filter(Boolean))];
    const theaterFilter = { id: { $in: theaterIds }, approved: true };
    if (city) theaterFilter.city = new RegExp(`^${escapeRegExp(city)}$`, "i");

    const theaters = await Theater.find(theaterFilter).lean();
    const theaterById = new Map(theaters.map((theater) => [theater.id, theater]));
    movies = mergeComingSoonMovies(movies, groupComingSoonShows(shows, theaterById));
  }

  return movies.find((movie) => matchesComingSoonMovie(movie, key)) ?? null;
}

function matchesComingSoonMovie(movie, key) {
  return [movie.id, movie.movieId, movie.title]
    .filter(Boolean)
    .map(normalizeComingSoonLookupKey)
    .includes(key);
}

function normalizeComingSoonLookupKey(value) {
  return slugify(String(value ?? "").replace(/^coming-soon-/i, ""));
}

function generatedComingSoonMovies(city = "") {
  const cityFilter = String(city ?? "")
    .trim()
    .toLowerCase();
  const matchingTheaters = catalogTheaters.filter(
    (theater) => !cityFilter || theater.city?.toLowerCase() === cityFilter,
  );
  const theaters = matchingTheaters.length ? matchingTheaters : catalogTheaters.slice(0, 8);
  const cityNames = uniqueList(theaters.map((theater) => theater.city).filter(Boolean));

  return comingSoonMovies
    .filter((movie) => hasPublicMovieTitle(movie.title))
    .map((movie, index) => {
      const releaseAt = resolveCatalogReleaseAt(movie, index);
      const visibleTheaters = rotateList(theaters, index).slice(0, 3);
      const poster = normalizeMovieImageUrl(movie.poster, movie.title, "poster");
      const backdrop = normalizeMovieImageUrl(movie.backdrop, movie.title, "backdrop", poster);
      return {
        id: `coming-soon-${movie.id}`,
        movieId: movie.id,
        title: movie.title,
        poster,
        backdrop,
        duration: movie.duration || "",
        genres: movie.genres ?? [],
        language: movie.language || "English",
        languages: splitCatalogList((movie.languages ?? movie.language) || "English"),
        format: movie.format ?? ["2D"],
        formats: splitCatalogList(movie.format ?? ["2D"]),
        certificate: movie.certificate || "UA",
        rating: movie.rating,
        votes: movie.votes || `${120 + index * 37}K`,
        cast: normalizeCastList(movie.cast),
        releaseAt,
        releaseDate: displayCatalogReleaseDate(movie.releaseDate, releaseAt),
        monthBucket: formatReleaseMonth(releaseAt),
        description: movie.description || "",
        category: categorizeComingSoonMovie(movie),
        cities: cityFilter ? [city] : cityNames.slice(0, 6),
        theaters: visibleTheaters.map((theater) => theater.name),
        listings: visibleTheaters.length,
      };
    });
}

function groupComingSoonShows(shows, theaterById) {
  const groups = new Map();

  shows.forEach((show) => {
    const theater = theaterById.get(show.theaterId);
    if (!theater) return;

    const rawKey = show.movieId || slugify(show.movie);
    const initialCatalogMovie = comingSoonMovieById.get(rawKey) ?? catalogMovieById.get(rawKey);
    const correctedTitle = correctComingSoonTitle(
      show.movie || initialCatalogMovie?.title || show.movieId,
    );
    if (!hasPublicMovieTitle(correctedTitle)) return;

    const correctedKey = slugify(correctedTitle);
    const key =
      correctedTitle !==
      String(show.movie || initialCatalogMovie?.title || show.movieId || "").trim()
        ? correctedKey
        : rawKey;
    if (!key) return;
    const catalogMovie =
      comingSoonMovieById.get(key) ?? catalogMovieById.get(key) ?? initialCatalogMovie;

    if (!groups.has(key)) {
      const releaseAt = normalizeDateInput(show.date || show.releaseDate);
      const title = correctedTitle || catalogMovie?.title || show.movieId;
      const poster = normalizeMovieImageUrl(show.poster || catalogMovie?.poster, title, "poster");
      const backdrop = normalizeMovieImageUrl(
        show.backdrop || show.poster || catalogMovie?.backdrop,
        title,
        "backdrop",
        poster,
      );
      groups.set(key, {
        id: `coming-soon-${key}`,
        movieId: key,
        title,
        poster:
          isFallbackMovieArtwork(poster) && catalogMovie?.poster ? catalogMovie.poster : poster,
        backdrop:
          isFallbackMovieArtwork(backdrop) && catalogMovie?.backdrop
            ? catalogMovie.backdrop
            : backdrop,
        duration: show.duration || catalogMovie?.duration || "",
        genres: new Set(
          splitCatalogList(show.genres).length
            ? splitCatalogList(show.genres)
            : splitCatalogList(catalogMovie?.genres),
        ),
        languages: new Set(splitCatalogList(show.language || catalogMovie?.language || "English")),
        formats: new Set(splitCatalogList(show.format || catalogMovie?.format || "2D")),
        certificate: show.certificate || catalogMovie?.certificate || "UA",
        rating: catalogMovie?.rating,
        votes: catalogMovie?.votes || "New",
        cast: normalizeCastList(show.cast?.length ? show.cast : catalogMovie?.cast),
        releaseAt,
        releaseDate: show.releaseDate || formatReleaseDate(releaseAt),
        monthBucket: formatReleaseMonth(releaseAt),
        description: show.description || catalogMovie?.description || "",
        bookingOpensAt: show.bookingOpensAt || "",
        trailerUrl: show.trailerUrl || "",
        notes: show.notes || "",
        cities: new Set(),
        theaters: new Set(),
        listings: 0,
      });
    }

    const group = groups.get(key);
    const nextReleaseAt = normalizeDateInput(show.date || show.releaseDate || group.releaseAt);
    if (new Date(nextReleaseAt) < new Date(group.releaseAt)) {
      group.releaseAt = nextReleaseAt;
      group.releaseDate = show.releaseDate || formatReleaseDate(nextReleaseAt);
      group.monthBucket = formatReleaseMonth(nextReleaseAt);
    }

    splitCatalogList(show.genres).forEach((genre) => group.genres.add(genre));
    splitCatalogList(show.language || "English").forEach((language) =>
      group.languages.add(language),
    );
    splitCatalogList(show.format || "2D").forEach((format) => group.formats.add(format));
    group.cities.add(theater.city);
    group.theaters.add(theater.name);
    group.listings += 1;
  });

  return [...groups.values()].map((group) => {
    const movie = {
      ...group,
      genres: [...group.genres],
      languages: [...group.languages],
      formats: [...group.formats],
      cities: [...group.cities],
      theaters: [...group.theaters],
    };

    return {
      ...movie,
      category: categorizeComingSoonMovie(movie),
    };
  });
}

function mergeComingSoonMovies(...lists) {
  const byId = new Map();
  lists.flat().forEach((movie) => {
    const key = movie.movieId || movie.id;
    if (!key) return;
    byId.set(key, mergeComingSoonMovie(byId.get(key), movie, key));
  });
  return [...byId.values()];
}

function mergeComingSoonMovie(current = {}, next = {}, key) {
  const poster =
    isFallbackMovieArtwork(next.poster) && current.poster ? current.poster : next.poster;
  const backdrop =
    isFallbackMovieArtwork(next.backdrop) && current.backdrop ? current.backdrop : next.backdrop;
  const cast = selectBestCast(current.cast, next.cast);

  return {
    ...current,
    ...next,
    id: next.id || current.id || `coming-soon-${key}`,
    poster,
    backdrop,
    cast,
  };
}

function selectBestCast(current = [], next = []) {
  const currentCast = verifiedCastList(current);
  const nextCast = verifiedCastList(next);
  return nextCast.length >= currentCast.length ? nextCast : currentCast;
}

function verifiedCastList(cast = []) {
  return (Array.isArray(cast) ? cast : []).filter(
    (member) => member?.avatar && !isGeneratedImageUrl(member.avatar),
  );
}

function normalizeCastList(cast = []) {
  if (!Array.isArray(cast)) return [];
  return cast
    .map((member) => {
      const name = String(member?.name ?? member ?? "").trim();
      if (!name) return null;
      const avatar = normalizeCastImageUrl(member?.avatar, name);
      if (isGeneratedImageUrl(avatar)) return null;
      return {
        name,
        role: String(member?.role ?? "Actor").trim() || "Actor",
        avatar,
      };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function formatMongoShow(show, theater, index, activeDate = "") {
  if (!theater) return null;
  const screen = theater.screens?.find((item) => item.id === show.screenId);
  const showDate = String(show.date || "").trim();
  const resolvedDate = showDate || String(activeDate || "").trim();
  return {
    id: scopedShowId(show.id, showDate, resolvedDate),
    movieId: show.movieId,
    theaterId: show.theaterId,
    theater: theater.name,
    city: theater.city,
    area: theater.area,
    address: theater.address,
    amenities: theater.amenities ?? [],
    logoText: theater.logoText,
    coverImage: theater.coverImage || "",
    screenId: show.screenId,
    screen: show.screen || screen?.name || "Screen 1",
    date: resolvedDate,
    startTime: show.startTime,
    endTime: show.endTime,
    time: show.time || show.startTime,
    format: show.format || "2D",
    language: show.language || "English",
    price: {
      platinum: Number(show.price?.platinum || 180 + index * 10),
      silver: Number(show.price?.silver || 220 + index * 12),
      gold: Number(show.price?.gold || 250 + index * 15),
      vip: Number(show.price?.vip || 400 + index * 20),
    },
    seatLayout: show.seatLayout || screen?.seatLayout || {},
    status: show.status || "ok",
    cancellable: show.cancellable !== false,
  };
}

function scopedShowId(id, showDate, resolvedDate) {
  if (showDate || !resolvedDate) return id;
  const suffix = resolvedDate.replace(/\D/g, "");
  if (!suffix || String(id).endsWith(`-${suffix}`)) return id;
  return `${id}-${suffix}`;
}

function isPublicShow(show) {
  const status = String(show.status || "").toLowerCase();
  return show.listingType !== "coming-soon" && status !== "draft" && status !== "coming soon";
}

function ownerScopedShowFilter(extra = {}) {
  return {
    ...extra,
    $or: [{ ownerId: { $exists: true, $ne: null } }],
  };
}

function matchesShowDate(show, date) {
  if (!date) return true;
  const value = String(show.date || "").trim();
  return !value || value === date;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function categorizeComingSoonMovie(movie) {
  const genres = splitCatalogList(movie.genres).map(normalizeText);
  const formats = splitCatalogList(movie.formats ?? movie.format).map(normalizeText);
  if (formats.some((format) => ["imax", "4dx", "laser"].includes(format))) {
    return "Premium formats";
  }
  if (genres.some((genre) => ["animation", "comedy", "family", "fantasy"].includes(genre))) {
    return "Family";
  }
  if (genres.some((genre) => ["biography", "drama", "history"].includes(genre))) {
    return "Critics' picks";
  }
  if (
    genres.some((genre) => ["action", "adventure", "sci-fi", "thriller", "crime"].includes(genre))
  ) {
    return "Blockbusters";
  }
  return "New releases";
}

function futureIsoDate(offsetDays) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function resolveCatalogReleaseAt(movie, index) {
  const releaseAt = String(movie.releaseAt || movie.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(releaseAt)) return releaseAt;
  return futureIsoDate(10 + index * 6);
}

function displayCatalogReleaseDate(value, releaseAt) {
  const label = String(value || "").trim();
  if (label && label !== "2026" && label !== "2026+" && label !== "Coming soon") return label;
  return formatReleaseDate(releaseAt);
}

function normalizeDateInput(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return futureIsoDate(14);
}

function formatReleaseDate(value) {
  const date = new Date(`${normalizeDateInput(value)}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatReleaseMonth(value) {
  const date = new Date(`${normalizeDateInput(value)}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function rotateList(list, offset) {
  if (!list.length) return [];
  const normalizedOffset = offset % list.length;
  return [...list.slice(normalizedOffset), ...list.slice(0, normalizedOffset)];
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function correctComingSoonTitle(value) {
  const title = String(value ?? "").trim();
  return (
    comingSoonTitleCorrections.get(normalizeText(title)) ||
    comingSoonTitleCorrections.get(slugify(title)) ||
    title
  );
}

function hasPublicMovieTitle(value) {
  const title = String(value ?? "").trim();
  return Boolean(title) && !/\bfilm$/i.test(title);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export { generatedShows, generatedTheaterShows, router as showRoutes };
