function buildCatalogCinemaSchedule({ cinema, catalog, activeDate, showTimes }) {
  const movieIds = splitCatalogList(cinema.movieIds);
  const listedMovies = movieIds.length
    ? movieIds.map((movieId) => catalog.find((movie) => movie.id === movieId)).filter(Boolean)
    : catalog;
  const plans = getCatalogTheaterPlans(cinema, showTimes);

  return listedMovies.map((movie) => ({
    movie,
    shows: plans.map((plan, index) =>
      buildCatalogShow({ movie, theater: cinema, plan, index, activeDate, showTimes }),
    ),
  }));
}

function buildCatalogTheaterListings({ movie, theaters, selectedCity, activeDate, showTimes }) {
  const cityKey = normalizeCatalogText(selectedCity || "");
  return theaters
    .filter(
      (theater) =>
        (!cityKey || normalizeCatalogText(theater.city) === cityKey) &&
        theaterHasMovie(theater, movie.id),
    )
    .map((theater) => ({
      id: theater.id,
      name: theater.name,
      city: theater.city,
      area: theater.area,
      address: theater.address,
      distance: theater.distance,
      amenities: splitCatalogList(theater.amenities),
      logoText: theater.logoText,
      isOwner: false,
      shows: getCatalogTheaterPlans(theater, showTimes).map((plan, index) =>
        buildCatalogShow({ movie, theater, plan, index, activeDate, showTimes }),
      ),
    }))
    .filter((cinema) => cinema.shows.length > 0);
}

function buildCatalogShow({ movie, theater, plan, index, activeDate, showTimes }) {
  const time =
    typeof plan === "string"
      ? plan
      : plan.time || plan.startTime || showTimes[index % showTimes.length];
  const screen = typeof plan === "string" ? "Screen 1" : plan.screen || "Screen 1";
  const screenLayout = getCatalogScreenLayout(theater, screen);
  const baseOffset = index * 12 + (String(theater.id).length % 5) * 10;
  const formats = splitCatalogList(movie.format ?? movie.formats);

  return {
    id: `${movie.id}-${theater.id}-${index}-${dateSuffix(activeDate)}`,
    label: time,
    screen,
    status:
      typeof plan === "string"
        ? inferCatalogShowStatus(index)
        : plan.status || inferCatalogShowStatus(index),
    format:
      (typeof plan === "string" ? "" : plan.format) ||
      formats[index % Math.max(formats.length, 1)] ||
      "2D",
    language: movie.language || "English",
    cancellable: typeof plan === "string" ? index % 2 === 1 : plan.cancellable !== false,
    price: {
      platinum: Number(plan?.price?.platinum || 180 + baseOffset),
      silver: Number(plan?.price?.silver || 220 + baseOffset),
      gold: Number(plan?.price?.gold || 260 + baseOffset),
      vip: Number(plan?.price?.vip || 420 + baseOffset),
    },
    seatLayout: screenLayout,
  };
}

function getCatalogTheaterPlans(theater, showTimes) {
  if (Array.isArray(theater.showPlan) && theater.showPlan.length) return theater.showPlan;
  return showTimes.map((time, index) => ({
    time,
    format: index % 2 === 0 ? "2D" : "IMAX",
    status: inferCatalogShowStatus(index),
    screen: "Screen 1",
    cancellable: index % 2 === 1,
  }));
}

function getCatalogScreenLayout(theater, screenName) {
  const screens = Array.isArray(theater.screens) ? theater.screens : [];
  const screen = screens.find((item) => item.name === screenName) || screens[0];
  const rowCount = Number(
    screen?.seatLayout?.rowCount ||
      (Array.isArray(screen?.seatLayout?.rows) ? screen.seatLayout.rows.length : 0) ||
      10,
  );
  const seatsPerRow = Number(
    screen?.seatLayout?.seatsPerRow ||
      screen?.seatLayout?.cols ||
      screen?.totalSeats / rowCount ||
      14,
  );

  return {
    rowCount,
    seatsPerRow,
    platinumRows: Number(screen?.seatLayout?.platinumRows || 2),
    silverRows: Number(screen?.seatLayout?.silverRows || 2),
    vipRows: Number(screen?.seatLayout?.vipRows || 2),
    aisleAfter: Number(screen?.seatLayout?.aisleAfter || Math.max(0, Math.floor(seatsPerRow / 2))),
    blockedSeats: splitCatalogList(screen?.seatLayout?.blockedSeats),
  };
}

function theaterHasMovie(theater, movieId) {
  const movieIds = splitCatalogList(theater.movieIds);
  return movieIds.length === 0 || movieIds.includes(movieId);
}

function inferCatalogShowStatus(index) {
  if (index === 4) return "sold";
  if (index === 3) return "fast";
  return "ok";
}

function splitCatalogList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCatalogText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function dateSuffix(value) {
  return String(value || "today").replace(/[^a-z0-9]+/gi, "");
}

export {
  buildCatalogCinemaSchedule,
  buildCatalogShow,
  buildCatalogTheaterListings,
  getCatalogScreenLayout,
  getCatalogTheaterPlans,
  inferCatalogShowStatus,
  splitCatalogList,
  theaterHasMovie,
};
