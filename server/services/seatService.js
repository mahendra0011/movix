function roomName(showId) {
  return `show:${showId}`;
}

async function getSeatState(showId, bookedSeats = [], heldSeats = [], ownerId = "") {
  const booked = [...new Set(bookedSeats.map(String))].sort();
  const bookedSet = new Set(booked);
  const held = [];
  const heldByMe = [];

  for (const entry of heldSeats) {
    const seat = String(typeof entry === "string" ? entry : (entry?.seat ?? "")).trim();
    if (!seat || bookedSet.has(seat)) continue;
    held.push(seat);
    if (ownerId && typeof entry === "object" && entry.ownerId === ownerId) heldByMe.push(seat);
  }

  return {
    showId,
    booked,
    held: [...new Set(held)].sort(),
    heldByMe: [...new Set(heldByMe)].sort(),
  };
}

export { getSeatState, roomName };
