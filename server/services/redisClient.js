import { createClient } from "redis";
import { env } from "../config/env.js";

let redisClient;
let redisReady = false;

async function connectRedis() {
  if (!env.redisUrl) {
    console.log("REDIS_URL not set. Seat locking will use in-memory locks.");
    return false;
  }

  try {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on("error", (error) => {
      redisReady = false;
      console.warn("Redis error:", error.message);
    });
    await redisClient.connect();
    redisReady = true;
    console.log("Redis connected.");
    return true;
  } catch (error) {
    redisReady = false;
    console.warn("Redis connection failed. Seat locking will use in-memory locks.");
    console.warn(error);
    return false;
  }
}

function getRedisClient() {
  return redisReady ? redisClient : null;
}

function isRedisReady() {
  return redisReady;
}

export { connectRedis, getRedisClient, isRedisReady };
