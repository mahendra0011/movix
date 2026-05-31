const DEFAULT_SEAT_HOLD_TTL_MS = 10 * 60 * 1000;

function createSeatHoldStore({ ttlMs = DEFAULT_SEAT_HOLD_TTL_MS } = {}) {
  const holdsByShow = new Map();

  function getShowHolds(showId) {
    const key = normalizeShowId(showId);
    if (!key) return new Map();

    const holds = holdsByShow.get(key);
    if (!holds) return new Map();

    pruneShow(key, Date.now());
    return holdsByShow.get(key) ?? new Map();
  }

  function getHeldSeats(showId) {
    return [...getShowHolds(showId).entries()]
      .map(([seat, hold]) => ({ seat, ownerId: hold.ownerId, expiresAt: hold.expiresAt }))
      .sort((left, right) => left.seat.localeCompare(right.seat));
  }

  function holdSeats(showId, seats, ownerId, bookedSeats = []) {
    const showKey = normalizeShowId(showId);
    const ownerKey = normalizeOwnerId(ownerId);
    const seatList = normalizeSeats(seats);

    if (!showKey || !ownerKey || seatList.length === 0) {
      return { ok: false, conflictSeats: seatList };
    }

    pruneShow(showKey, Date.now());

    const bookedSet = new Set(bookedSeats.map(String));
    const showHolds = holdsByShow.get(showKey) ?? new Map();
    const conflictSeats = seatList.filter((seat) => {
      const hold = showHolds.get(seat);
      return bookedSet.has(seat) || (hold && hold.ownerId !== ownerKey);
    });

    if (conflictSeats.length > 0) {
      return { ok: false, conflictSeats };
    }

    const expiresAt = Date.now() + ttlMs;
    for (const seat of seatList) {
      showHolds.set(seat, { ownerId: ownerKey, expiresAt });
    }
    holdsByShow.set(showKey, showHolds);

    return { ok: true, seats: seatList, expiresAt };
  }

  function releaseSeats(showId, seats, ownerId) {
    const showKey = normalizeShowId(showId);
    const ownerKey = normalizeOwnerId(ownerId);
    const seatList = normalizeSeats(seats);
    if (!showKey || seatList.length === 0) return [];

    const showHolds = getShowHolds(showKey);
    const released = [];

    for (const seat of seatList) {
      const hold = showHolds.get(seat);
      if (!hold) continue;
      if (ownerKey && hold.ownerId !== ownerKey) continue;
      showHolds.delete(seat);
      released.push(seat);
    }

    if (showHolds.size === 0) holdsByShow.delete(showKey);
    else holdsByShow.set(showKey, showHolds);

    return released;
  }

  function releaseOwner(ownerId) {
    const ownerKey = normalizeOwnerId(ownerId);
    if (!ownerKey) return [];

    const affectedShows = [];
    for (const [showId, showHolds] of holdsByShow.entries()) {
      let changed = false;
      for (const [seat, hold] of showHolds.entries()) {
        if (hold.ownerId === ownerKey) {
          showHolds.delete(seat);
          changed = true;
        }
      }

      if (changed) affectedShows.push(showId);
      if (showHolds.size === 0) holdsByShow.delete(showId);
    }

    return affectedShows;
  }

  function findConflicts(showId, seats, ownerId, bookedSeats = []) {
    const ownerKey = normalizeOwnerId(ownerId);
    const bookedSet = new Set(bookedSeats.map(String));
    const showHolds = getShowHolds(showId);

    return normalizeSeats(seats).filter((seat) => {
      const hold = showHolds.get(seat);
      return bookedSet.has(seat) || (hold && (!ownerKey || hold.ownerId !== ownerKey));
    });
  }

  function releaseBookedSeats(showId, seats) {
    return releaseSeats(showId, seats);
  }

  function pruneShow(showId, now) {
    const showHolds = holdsByShow.get(showId);
    if (!showHolds) return;

    for (const [seat, hold] of showHolds.entries()) {
      if (hold.expiresAt <= now) showHolds.delete(seat);
    }

    if (showHolds.size === 0) holdsByShow.delete(showId);
  }

  return {
    findConflicts,
    getHeldSeats,
    holdSeats,
    releaseBookedSeats,
    releaseOwner,
    releaseSeats,
  };
}

function normalizeShowId(showId) {
  return String(showId ?? "").trim();
}

function normalizeOwnerId(ownerId) {
  return String(ownerId ?? "").trim();
}

function normalizeSeats(seats) {
  return Array.isArray(seats)
    ? [...new Set(seats.map((seat) => String(seat).trim()).filter(Boolean))]
    : [];
}

export { createSeatHoldStore, DEFAULT_SEAT_HOLD_TTL_MS };
