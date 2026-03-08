// connect to redis

import dotenv from "dotenv";
import Redis from "ioredis";

const path = process.env.NODE_ENV === "test" ? ".env.local" : ".env.production";

dotenv.config({ path });

let cachedRedis: Redis | undefined;

export const getRedis = (): Redis => {
	console.log("Connecting to Redis...");
	if (cachedRedis) {
		console.log("Using cached Redis connection");
		return cachedRedis;
	}

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		throw new Error("REDIS_URL environment variable is not set");
	}

	console.log("Creating new Redis connection");
	const redis = new Redis(redisUrl);
	cachedRedis = redis;
	return cachedRedis;
};
