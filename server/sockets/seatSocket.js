import {
  getSeatState,
  lockSeats,
  releaseOwnerLocks,
  releaseSeats,
  roomName,
  sweepMemoryLocks,
} from "../services/seatService.js";

function registerSeatSockets(io, { getBookedSeats }) {
  async function emitSeatState(showId) {
    const state = await getSeatState(showId, await getBookedSeats(showId));
    io.to(roomName(showId)).emit("seat-state", state);
    return state;
  }

  io.on("connection", (socket) => {
    const ownerId = socket.handshake.auth?.ownerId || socket.id;
    socket.data.ownerId = ownerId;
    socket.data.shows = new Set();

    socket.on("join-show", async ({ showId }, ack) => {
      if (!showId) return;
      socket.join(roomName(showId));
      socket.data.shows.add(showId);
      const state = await emitSeatState(showId);
      ack?.({ ok: true, state });
    });

    socket.on("lock-seats", async ({ showId, seats }, ack) => {
      const result = await lockSeats({ showId, seats, ownerId });
      const state = await emitSeatState(showId);
      ack?.({ ...result, state });
    });

    socket.on("release-seats", async ({ showId, seats }, ack) => {
      await releaseSeats({ showId, seats, ownerId });
      const state = await emitSeatState(showId);
      ack?.({ ok: true, state });
    });

    socket.on("disconnect", async () => {
      const affectedShows = await releaseOwnerLocks(ownerId);
      for (const showId of affectedShows) {
        await emitSeatState(showId);
      }
    });
  });

  setInterval(async () => {
    const expiredShows = sweepMemoryLocks();
    for (const showId of expiredShows) {
      await emitSeatState(showId);
    }
  }, 10_000).unref?.();
}

export { registerSeatSockets };
