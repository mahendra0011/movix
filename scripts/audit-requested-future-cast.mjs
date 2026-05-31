import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requestedFutureComingSoonMovieSeeds } from "../src/features/movies/data/requestedFutureMovieSeeds.js";

const REPORT_FILE = resolve("reports/requested-future-cast-audit.json");

const report = JSON.parse(await readFile(REPORT_FILE, "utf8"));
const reportByTitle = new Map(report.map((item) => [item.title, item]));
const mismatches = [];

for (const movie of requestedFutureComingSoonMovieSeeds) {
  const auditRow = reportByTitle.get(movie.title);
  if (!auditRow) {
    mismatches.push({ title: movie.title, reason: "missing-report-row" });
    continue;
  }

  const expected = (auditRow.verifiedCast ?? []).map(castKey);
  const actual = (movie.cast ?? []).map(castKey);
  if (expected.join("|") !== actual.join("|")) {
    mismatches.push({
      title: movie.title,
      reason: "cast-mismatch",
      expected: auditRow.verifiedCast,
      actual: movie.cast,
    });
  }
}

const summary = {
  movies: requestedFutureComingSoonMovieSeeds.length,
  withVerifiedCast: requestedFutureComingSoonMovieSeeds.filter((movie) => movie.cast.length).length,
  emptyAsUnverified: requestedFutureComingSoonMovieSeeds.filter((movie) => !movie.cast.length)
    .length,
  uniqueActors: new Set(requestedFutureComingSoonMovieSeeds.flatMap((movie) => movie.cast)).size,
  mismatches: mismatches.length,
};

console.log(JSON.stringify(summary, null, 2));

if (mismatches.length) {
  console.error(JSON.stringify(mismatches, null, 2));
  process.exitCode = 1;
}

function castKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
