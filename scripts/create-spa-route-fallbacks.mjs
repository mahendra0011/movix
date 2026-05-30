import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

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

await Promise.all(
  routes.map(async (route) => {
    const routeDir = new URL(`${route}/`, distDir);
    await mkdir(routeDir, { recursive: true });
    await copyFile(indexFile, join(fileURLToPath(routeDir), "index.html"));
  }),
);
