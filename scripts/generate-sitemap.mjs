import { writeFile } from "node:fs/promises";
import { movies, theaters, comingSoonMovies } from "../src/features/movies/data/movieCatalog.js";

const BASE = "https://movix.example.com";
const TODAY = new Date().toISOString().split("T")[0];

function url(loc, priority = "0.5", changefreq = "monthly") {
  return `  <url>\n    <loc>${BASE}${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

const entries = [
  url("/", "1.0", "daily"),
  url("/movies", "0.9", "daily"),
  url("/coming-soon", "0.8", "weekly"),
  url("/offers", "0.6", "weekly"),
  url("/wishlist", "0.3", "monthly"),
  url("/auth", "0.3", "monthly"),
  ...movies.map((m) => url(`/movies/${m.id}`, "0.8", "weekly")),
  ...theaters.map((t) => url(`/cinemas/${t.id}`, "0.6", "monthly")),
  ...comingSoonMovies.map((m) => {
    const id = m.movieId || m.id;
    return url(`/coming-soon/${id}`, "0.7", "weekly");
  }),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

await writeFile(new URL("../dist/sitemap.xml", import.meta.url), sitemap, "utf-8");
console.log(`sitemap.xml generated with ${entries.length} URLs`);
