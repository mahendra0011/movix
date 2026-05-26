import { env } from "../config/env.js";
import { getRedisClient } from "./redisClient.js";

const memoryLocks = new Map();

function lockKey(showId, seat) {
  return `seat-lock:${showId}:${seat}`;
}

function roomName(showId) {
  return `show:${showId}`;
}

function parseLock(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeSeats(seats) {
  return Array.isArray(seats)
    ? [...new Set(seats.map((seat) => String(seat).trim()).filter(Boolean))]
    : [];
}

function sweepMemoryLocks() {
  const now = Date.now();
  const expiredShows = new Set();

  for (const [key, lock] of memoryLocks.entries()) {
    if (lock.expiresAt <= now) {
      memoryLocks.delete(key);
      expiredShows.add(lock.showId);
    }
  }

  return [...expiredShows];
}

async function getActiveLocks(showId) {
  sweepMemoryLocks();
  const redis = getRedisClient();

  if (redis) {
    const keys = await redis.keys(lockKey(showId, "*"));
    if (keys.length === 0) return [];
    const values = await redis.mGet(keys);
    return values.map(parseLock).filter(Boolean);
  }

  return [...memoryLocks.values()].filter((lock) => lock.showId === showId);
}

async function getSeatState(showId, bookedSeats = []) {
  const locks = await getActiveLocks(showId);
  return {
    showId,
    booked: [...new Set(bookedSeats)].sort(),
    locks: locks.sort((a, b) => a.seat.localeCompare(b.seat)),
    lockTtlMs: env.lockTtlMs,
  };
}

async function lockSeats({ showId, seats, ownerId }) {
  const seatList = normalizeSeats(seats);
  if (!showId || !ownerId || seatList.length === 0) {
    return { ok: false, conflictSeats: [], message: "showId, ownerId, and seats are required." };
  }

  const expiresAt = Date.now() + env.lockTtlMs;
  const redis = getRedisClient();
  const acquired = [];
  const conflicts = [];

  if (redis) {
    for (const seat of seatList) {
      const key = lockKey(showId, seat);
      const existing = parseLock(await redis.get(key));

      if (existing && existing.ownerId !== ownerId) {
        conflicts.push(seat);
        continue;
      }

      const lock = { showId, seat, ownerId, expiresAt };
      const result = existing
        ? await redis.set(key, JSON.stringify(lock), { PX: env.lockTtlMs })
        : await redis.set(key, JSON.stringify(lock), { NX: true, PX: env.lockTtlMs });

      if (result) acquired.push(seat);
      else conflicts.push(seat);
    }

    if (conflicts.length > 0) {
      await releaseSeats({ showId, seats: acquired, ownerId });
      return { ok: false, conflictSeats: conflicts };
    }

    return { ok: true, locks: seatList.map((seat) => ({ showId, seat, ownerId, expiresAt })) };
  }

  sweepMemoryLocks();
  for (const seat of seatList) {
    const key = lockKey(showId, seat);
    const existing = memoryLocks.get(key);

    if (existing && existing.ownerId !== ownerId) {
      conflicts.push(seat);
      continue;
    }

    memoryLocks.set(key, { showId, seat, ownerId, expiresAt });
    acquired.push(seat);
  }

  if (conflicts.length > 0) {
    await releaseSeats({ showId, seats: acquired, ownerId });
    return { ok: false, conflictSeats: conflicts };
  }

  return { ok: true, locks: seatList.map((seat) => ({ showId, seat, ownerId, expiresAt })) };
}

async function releaseSeats({ showId, seats, ownerId }) {
  const seatList = normalizeSeats(seats);
  const redis = getRedisClient();

  if (redis) {
    for (const seat of seatList) {
      const key = lockKey(showId, seat);
      const existing = parseLock(await redis.get(key));
      if (!existing || (ownerId && existing.ownerId !== ownerId)) continue;
      await redis.del(key);
    }
    return;
  }

  for (const seat of seatList) {
    const key = lockKey(showId, seat);
    const existing = memoryLocks.get(key);
    if (!existing || (ownerId && existing.ownerId !== ownerId)) continue;
    memoryLocks.delete(key);
  }
}

async function releaseOwnerLocks(ownerId) {
  const affectedShows = new Set();
  const redis = getRedisClient();

  if (redis) {
    const keys = await redis.keys("seat-lock:*");
    for (const key of keys) {
      const existing = parseLock(await redis.get(key));
      if (existing?.ownerId === ownerId) {
        affectedShows.add(existing.showId);
        await redis.del(key);
      }
    }
    return [...affectedShows];
  }

  for (const [key, lock] of memoryLocks.entries()) {
    if (lock.ownerId === ownerId) {
      affectedShows.add(lock.showId);
      memoryLocks.delete(key);
    }
  }

  return [...affectedShows];
}

async function verifySeatLocks({ showId, seats, ownerId }) {
  const seatList = normalizeSeats(seats);
  const locks = await getActiveLocks(showId);
  const lockMap = new Map(locks.map((lock) => [lock.seat, lock.ownerId]));
  return seatList.every((seat) => lockMap.get(seat) === ownerId);
}

export {
  getSeatState,
  lockSeats,
  releaseOwnerLocks,
  releaseSeats,
  roomName,
  sweepMemoryLocks,
  verifySeatLocks,
};
