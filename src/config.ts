import { z } from "zod";

const numberFromEnv = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: numberFromEnv(8787),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters (try: openssl rand -hex 32)"),
  JWT_ACCESS_TTL: z.string().min(2).default("15m"),
  JWT_REFRESH_TTL_DAYS: numberFromEnv(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
});

export type Config = z.infer<typeof schema>;

// Fails fast with a message that names every bad key, instead of a crash on first use.
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid configuration:\n${problems}`);
  }
  return result.data;
}

require("dotenv").config();

export const config: Config = loadConfig(process.env);
