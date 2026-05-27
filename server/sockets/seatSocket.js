import { getSeatState, roomName } from "../services/seatService.js";

function registerSeatSockets(io, { getBookedSeats }) {
  async function emitSeatState(showId) {
    const state = await getSeatState(showId, await getBookedSeats(showId));
    io.to(roomName(showId)).emit("seat-state", state);
    return state;
  }

  io.on("connection", (socket) => {
    socket.data.shows = new Set();

    socket.on("join-show", async ({ showId }, ack) => {
      if (!showId) return;
      socket.join(roomName(showId));
      socket.data.shows.add(showId);
      const state = await emitSeatState(showId);
      ack?.({ ok: true, state });
    });

    socket.on("refresh-seat-state", async ({ showId }, ack) => {
      const state = await emitSeatState(showId);
      ack?.({ ok: true, state });
    });
  });
}

export { registerSeatSockets };
