import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // All files share one Redis, so they must not run at the same time.
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      NODE_ENV: "test",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6380",
      JWT_SECRET: "test-secret-test-secret-test-secret-0123456789",
      BCRYPT_ROUNDS: "4",
      LOG_LEVEL: "silent",
      // Tests make far more requests than a real client; the rate limit has its own tests.
      RATE_LIMIT_PER_MINUTE: "1000000",
      RATE_LIMIT_AUTH_PER_MINUTE: "1000000",
      CORS_ORIGINS: "http://localhost:8081",
    },
  },
});
