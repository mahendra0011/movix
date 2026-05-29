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
  if (!image.includes("/image/fetch/")) return image;

  try {
    const url = new URL(image);
    const parts = url.pathname.split("/");
    const fetchIndex = parts.findIndex((part) => part === "fetch");
    if (fetchIndex === -1) return image;
    const encodedSource = parts.slice(fetchIndex + 1).findLast((part) => /^https?%3A/i.test(part));
    return encodedSource ? decodeURIComponent(encodedSource) : image;
  } catch {
    return image;
  }
}

function movieImageFallback(title, type = "poster") {
  const width = type === "backdrop" ? 1280 : 780;
  const height = type === "backdrop" ? 720 : 1170;
  return svgDataUri({
    width,
    height,
    title: title || "Movie",
    subtitle: type === "backdrop" ? "movix backdrop" : "movix poster",
  });
}

function castAvatarFallback(name) {
  return svgDataUri({
    width: 256,
    height: 256,
    title: initials(name),
    subtitle: "Cast",
    round: true,
  });
}

function svgDataUri({ width, height, title, subtitle, round = false }) {
  const safeTitle = escapeXml(String(title || "Movie").slice(0, 42));
  const safeSubtitle = escapeXml(String(subtitle || "movix").slice(0, 32));
  const titleSize = round ? 76 : Math.max(34, Math.round(width / 15));
  const subtitleSize = round ? 28 : Math.max(22, Math.round(width / 34));
  const radius = round ? width / 2 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#0f766e"/><stop offset="55%" stop-color="#111827"/><stop offset="100%" stop-color="#e11d48"/></linearGradient></defs><rect width="${width}" height="${height}" rx="${radius}" fill="url(#g)"/><circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.18)}" r="${Math.round(width * 0.22)}" fill="#ffffff" opacity="0.1"/><text x="50%" y="48%" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="800">${safeTitle}</text><text x="50%" y="58%" text-anchor="middle" fill="#ccfbf1" font-family="Arial, sans-serif" font-size="${subtitleSize}" font-weight="700">${safeSubtitle}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function initials(value) {
  return String(value || "Cast")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { castAvatarFallback, movieImageFallback, normalizeImageUrl, normalizeMovieMedia };
