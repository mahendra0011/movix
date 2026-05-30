import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { comingSoonMovies, movies, theaters } from "../src/features/movies/data/movieCatalog.js";

const distDir = new URL("../dist/", import.meta.url);
const indexFile = new URL("index.html", distDir);
const routes = [
  "admin",
  "auth",
  "book",
  "cinemas",
  "coming-soon",
  "confirmation",
  "dashboard",
  "movies",
  "owner",
  "sports",
  "wishlist",
];
const dynamicRoutes = [
  ...movies.map((movie) => `movies/${movie.id}`),
  ...comingSoonMovies.map((movie) => `movies/${movie.id}`),
  ...theaters.map((theater) => `cinemas/${theater.id}`),
];
const fallbackRoutes = [...new Set([...routes, ...dynamicRoutes].filter(Boolean))];

await Promise.all(
  fallbackRoutes.map(async (route) => {
    const routeDir = new URL(`${route}/`, distDir);
    await mkdir(routeDir, { recursive: true });
    await copyFile(indexFile, join(fileURLToPath(routeDir), "index.html"));
  }),
);

await copyFile(indexFile, new URL("404.html", distDir));
