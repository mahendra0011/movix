const MOVIE_ARTWORK_FALLBACKS = [
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140021/movix/movie-artwork/movie-fallback-1.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140023/movix/movie-artwork/movie-fallback-2.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140024/movix/movie-artwork/movie-fallback-3.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140026/movix/movie-artwork/movie-fallback-4.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140027/movix/movie-artwork/movie-fallback-5.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140028/movix/movie-artwork/movie-fallback-6.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140030/movix/movie-artwork/movie-fallback-7.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/v1780140033/movix/movie-artwork/movie-fallback-8.jpg",
];

function normalizeMovieMedia(movie) {
  if (!movie) return movie;
  const title = String(movie.title || "Movie").trim() || "Movie";
  const poster = normalizeMovieImageUrl(movie.poster, title, "poster");
  const backdrop = normalizeMovieImageUrl(movie.backdrop, title, "backdrop", poster);

  return {
    ...movie,
    poster,
    backdrop,
    cast: normalizeCastMedia(movie.cast),
  };
}

function normalizeCastMedia(cast = []) {
  return (Array.isArray(cast) ? cast : [])
    .map((member) => {
      const name = String(member?.name ?? "").trim();
      if (!name) return null;
      return {
        ...member,
        name,
        role: String(member?.role ?? "Actor").trim() || "Actor",
        avatar: normalizeCastImageUrl(member?.avatar, name),
      };
    })
    .filter(Boolean);
}

function normalizeImageUrl(value) {
  const image = String(value || "").trim();
  return image;
}

function movieImageFallback(title, type = "poster") {
  const artwork = MOVIE_ARTWORK_FALLBACKS[hashString(title) % MOVIE_ARTWORK_FALLBACKS.length];
  return transformCloudinaryImage(artwork, type);
}

function castAvatarFallback(name) {
  return cloudinaryGeneratedImageUrl({
    width: 256,
    height: 256,
    text: initials(name),
    fontSize: 72,
    baseImage: "sample.jpg",
    rounded: true,
  });
}

function cloudinaryGeneratedImageUrl({
  width,
  height,
  text,
  fontSize,
  baseImage,
  rounded = false,
}) {
  const label = cloudinaryText(text);
  const transforms = [
    "f_auto",
    "q_auto",
    `w_${width}`,
    `h_${height}`,
    "c_fill",
    rounded ? "r_max" : "",
    "e_blur:1200",
    `l_text:Arial_${fontSize}_bold:${label},co_white,g_center`,
    "fl_layer_apply",
  ].filter(Boolean);
  return `https://res.cloudinary.com/dfmetzhrk/image/upload/${transforms.join("/")}/${baseImage}`;
}

function cloudinaryText(value) {
  return encodeURIComponent(
    String(value || "Movie")
      .replace(/[^a-z0-9 ]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 32) || "Movie",
  );
}

function normalizeMovieImageUrl(value, title, type = "poster", fallback) {
  const image = normalizeImageUrl(value);
  if (isSafeMovieImageUrl(image)) return transformCloudinaryImage(image, type);
  if (isSafeMovieImageUrl(fallback)) return transformCloudinaryImage(fallback, type);
  return movieImageFallback(title, type);
}

function normalizeCastImageUrl(value, name) {
  const image = normalizeImageUrl(value);
  return isSafeCastImageUrl(image) ? image : castAvatarFallback(name);
}

function isSafeMovieImageUrl(value) {
  const image = normalizeImageUrl(value);
  return (
    isCloudinaryImageUrl(image) &&
    !isCastMediaImage(image) &&
    !isGeneratedImageUrl(image) &&
    !image.startsWith("data:")
  );
}

function isSafeCastImageUrl(value) {
  const image = normalizeImageUrl(value);
  if (!isCloudinaryImageUrl(image) || image.startsWith("data:")) return false;
  if (image.includes("/movix/movie-artwork/")) return false;
  if (image.includes("/poster") || image.includes("/backdrop")) return false;
  return true;
}

function isCloudinaryImageUrl(value) {
  return /^https:\/\/res\.cloudinary\.com\//.test(normalizeImageUrl(value));
}

function isCastMediaImage(value) {
  return /\/(?:real-cast|cast)\//.test(normalizeImageUrl(value));
}

function isGeneratedImageUrl(value) {
  return normalizeImageUrl(value).includes("l_text:");
}

function transformCloudinaryImage(value, type = "poster") {
  const image = normalizeImageUrl(value);
  if (!isCloudinaryImageUrl(image)) return image;
  const transform =
    type === "backdrop" ? "f_auto,q_auto,w_1280,h_720,c_fill" : "f_auto,q_auto,w_780,h_1170,c_fill";
  return image.replace(
    /\/image\/upload\/(?:f_auto,q_auto,w_\d+,h_\d+,c_fill\/)?/,
    `/image/upload/${transform}/`,
  );
}

function hashString(value) {
  return [...String(value || "Movie")].reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function initials(value) {
  return (
    String(value || "Cast")
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "C"
  );
}

export {
  castAvatarFallback,
  isCastMediaImage,
  isGeneratedImageUrl,
  isSafeCastImageUrl,
  isSafeMovieImageUrl,
  movieImageFallback,
  normalizeCastImageUrl,
  normalizeImageUrl,
  normalizeMovieImageUrl,
  normalizeMovieMedia,
};
