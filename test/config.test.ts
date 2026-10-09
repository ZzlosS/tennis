import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const valid = { JWT_SECRET: "x".repeat(32) };

describe("config", () => {
  it("applies defaults", () => {
    const config = loadConfig(valid);
    expect(config.PORT).toBe(8787);
    expect(config.REDIS_URL).toBe("redis://localhost:6379");
    expect(config.JWT_ACCESS_TTL).toBe("15m");
    expect(config.JWT_REFRESH_TTL_DAYS).toBe(30);
    expect(config.BCRYPT_ROUNDS).toBe(12);
    expect(config.CORS_ORIGINS).toEqual([]);
  });

  it("refuses to start without a secret, and names the key", () => {
    expect(() => loadConfig({})).toThrow(/JWT_SECRET/);
  });

  it("refuses a short secret", () => {
    expect(() => loadConfig({ JWT_SECRET: "lestra" })).toThrow(/JWT_SECRET.*32/);
  });

  it("reads numbers and lists from strings", () => {
    const config = loadConfig({
      ...valid,
      PORT: "9000",
      CORS_ORIGINS: " https://app.example.com, http://localhost:8081 ,",
    });
    expect(config.PORT).toBe(9000);
    expect(config.CORS_ORIGINS).toEqual(["https://app.example.com", "http://localhost:8081"]);
  });

  it("names every bad key at once", () => {
    expect(() => loadConfig({ ...valid, PORT: "abc", BCRYPT_ROUNDS: "1" })).toThrow(/PORT[\s\S]*BCRYPT_ROUNDS/);
  });
});
