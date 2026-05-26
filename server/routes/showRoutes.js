import { Router } from "express";
import { showTimes, theaters } from "../seed.js";

const router = Router();

function generatedShows(movieId) {
  return theaters.flatMap((theater) =>
    showTimes.map((time, index) => ({
      id: `${movieId}-${theater.id}-${index}`,
      movieId,
      theaterId: theater.id,
      theater: theater.name,
      screenId: `${theater.id}-screen-1`,
      screen: "Screen 3",
      startTime: time,
      endTime: "Auto calculated",
      format: index % 2 === 0 ? "IMAX" : "2D",
      language: "English",
      price: {
        platinum: 180 + index * 10,
        gold: 250 + index * 15,
        vip: 400 + index * 20,
      },
      status: index === 4 ? "sold" : index === 3 ? "fast" : "available",
    })),
  );
}

router.get("/:movieId", (request, response) => {
  response.json({ shows: generatedShows(request.params.movieId) });
});

export { generatedShows, router as showRoutes };
