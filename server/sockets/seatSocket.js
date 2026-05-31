import { getSeatState, roomName } from "../services/seatService.js";

function registerSeatSockets(io, { getBookedSeats, seatHolds }) {
  async function buildSeatState(showId, ownerId = "", snapshot) {
    const bookedSeats = snapshot?.bookedSeats ?? (await getBookedSeats(showId));
    const heldSeats = snapshot?.heldSeats ?? seatHolds.getHeldSeats(showId);
    return getSeatState(showId, bookedSeats, heldSeats, ownerId);
  }

  async function emitSeatState(showId) {
    const snapshot = {
      bookedSeats: await getBookedSeats(showId),
      heldSeats: seatHolds.getHeldSeats(showId),
    };
    const state = await buildSeatState(showId, "", snapshot);
    const sockets = await io.in(roomName(showId)).fetchSockets();
    for (const client of sockets) {
      client.emit("seat-state", await buildSeatState(showId, client.id, snapshot));
    }
    return state;
  }

  io.on("connection", (socket) => {
    socket.data.shows = new Set();

    socket.on("join-show", async (payload = {}, ack) => {
      const { showId } = payload;
      if (!showId) return;
      socket.join(roomName(showId));
      socket.data.shows.add(showId);
      await emitSeatState(showId);
      ack?.({ ok: true, state: await buildSeatState(showId, socket.id), holdToken: socket.id });
    });

    socket.on("refresh-seat-state", async (payload = {}, ack) => {
      const { showId } = payload;
      if (!showId) {
        ack?.({ ok: false });
        return;
      }
      const state = await buildSeatState(showId, socket.id);
      await emitSeatState(showId);
      ack?.({ ok: true, state });
    });

    socket.on("hold-seats", async (payload = {}, ack) => {
      const { showId, seats } = payload;
      if (!showId) {
        ack?.({ ok: false, conflictSeats: [] });
        return;
      }
      const result = seatHolds.holdSeats(showId, seats, socket.id, await getBookedSeats(showId));
      const state = await emitSeatState(showId);
      ack?.({
        ...result,
        state: await buildSeatState(showId, socket.id),
        conflictSeats: result.conflictSeats ?? [],
        holdToken: socket.id,
      });
      return state;
    });

    socket.on("release-seats", async (payload = {}, ack) => {
      const { showId, seats } = payload;
      if (!showId) {
        ack?.({ ok: false, releasedSeats: [] });
        return;
      }
      const releasedSeats = seatHolds.releaseSeats(showId, seats, socket.id);
      const state = await emitSeatState(showId);
      ack?.({ ok: true, releasedSeats, state: await buildSeatState(showId, socket.id) });
    });

    socket.on("disconnect", () => {
      const affectedShows = seatHolds.releaseOwner(socket.id);
      for (const showId of affectedShows) {
        emitSeatState(showId).catch((error) =>
          console.warn("Seat state emit failed after disconnect:", error.message),
        );
      }
    });
  });
}

export { registerSeatSockets };
