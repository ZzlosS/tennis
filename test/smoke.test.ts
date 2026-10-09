import { describe, expect, it } from "vitest";
import { api } from "./helpers";
import RedisClient from "../src/services/redisClient";

describe("smoke", () => {
  it("serves the root route", async () => {
    const response = await api().get("/");
    expect(response.status).toBe(200);
  });

  it("talks to the test Redis, which supports search and JSON", async () => {
    expect(await RedisClient.execute("PING")).toBe("PONG");
    const modules = String(await RedisClient.execute("MODULE", "LIST")).toLowerCase();
    expect(modules).toContain("search");
  });

  it("answers unknown paths with the standard error shape", async () => {
    const response = await api().get("/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(typeof response.body.error.message).toBe("string");
  });

  it("answers malformed JSON with VALIDATION_FAILED", async () => {
    const response = await api().post("/players/login").set("Content-Type", "application/json").send("{not json");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });
});
