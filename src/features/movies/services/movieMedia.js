function normalizeMovieMedia(movie) {
  if (!movie) return movie;
  const title = String(movie.title || "Movie").trim() || "Movie";
  const poster = normalizeImageUrl(movie.poster) || movieImageFallback(title, "poster");
  const backdrop = normalizeImageUrl(movie.backdrop) || movieImageFallback(title, "backdrop");

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
        avatar: normalizeImageUrl(member?.avatar) || castAvatarFallback(name),
      };
    })
    .filter(Boolean);
}

function normalizeImageUrl(value) {
  const image = String(value || "").trim();
  return image;
}

function movieImageFallback(title, type = "poster") {
  const width = type === "backdrop" ? 1280 : 780;
  const height = type === "backdrop" ? 720 : 1170;
  return cloudinaryGeneratedImageUrl({
    width,
    height,
    text: title || "Movie",
    fontSize: type === "backdrop" ? 74 : 58,
    baseImage: "sample.jpg",
  });
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

export { castAvatarFallback, movieImageFallback, normalizeImageUrl, normalizeMovieMedia };
