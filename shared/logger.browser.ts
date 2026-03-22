const isDev = process.env.NODE_ENV === "development";

export function getLogger(context: Record<string, unknown> = {}) {
	const prefix = context.module ? `[${context.module}]` : "";
	return {
		log: (...args: unknown[]) => isDev && console.log(prefix, ...args),
		error: (...args: unknown[]) => isDev && console.error(prefix, ...args),
		warn: (...args: unknown[]) => isDev && console.warn(prefix, ...args),
		debug: (...args: unknown[]) => isDev && console.debug(prefix, ...args),
		info: (...args: unknown[]) => isDev && console.info(prefix, ...args),
	};
}
