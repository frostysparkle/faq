type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, message: string, meta?: unknown): void {
  const payload = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  process.stdout.write(
    `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${payload}\n`
  );
}

export const logger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta)
};
