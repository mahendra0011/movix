function roomName(showId) {
  return `show:${showId}`;
}

async function getSeatState(showId, bookedSeats = []) {
  return {
    showId,
    booked: [...new Set(bookedSeats.map(String))].sort(),
  };
}

export { getSeatState, roomName };
