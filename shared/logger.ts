// src/lib/logger.ts
import { createLogger, format, type Logger, transports } from "winston";

const { combine, timestamp, printf, colorize, json, errors, splat } = format;

const isDev = process.env.NODE_ENV !== "production";

// Dev log format: readable, colored, shows metadata
const devFormat = printf(({ timestamp, level, message, ...meta }) => {
	let metaString = "";
	if (Object.keys(meta).length > 0) {
		metaString = JSON.stringify(meta, null, 2);
	}
	return `[${timestamp}] ${level}: ${message} ${metaString}`;
});

const logger: Logger = createLogger({
	level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
	format: combine(
		timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
		errors({ stack: true }), // include stack trace for errors
		splat(), // for printf formatting with placeholders
		isDev ? combine(colorize(), devFormat) : json(),
	),
	transports: [
		new transports.Console(),
		// Optional file logging in production
		...(isDev
			? []
			: [
					new transports.File({ filename: "logs/error.log", level: "error" }),
					new transports.File({ filename: "logs/combined.log" }),
				]),
	],
});

// Helper to create a child logger with extra context (module, request, etc.)
export function getLogger(context: Record<string, unknown> = {}) {
	return logger.child(context);
}

// Default export is the base logger
export { logger };
