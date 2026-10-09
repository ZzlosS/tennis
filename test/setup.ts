import { afterAll, afterEach, beforeAll, beforeEach, expect } from "vitest";
import { setClock } from "../src/services/clock";
import RedisClient from "../src/services/redisClient";
import { violations } from "./specValidator";

beforeAll(async () => {
  await RedisClient.connect();
});

// Each test starts from an empty database, on the same day: Friday 9 October 2026, 10:00 in Belgrade.
export const TEST_NOW = "2026-10-09T08:00:00Z";
beforeEach(async () => {
  setClock(TEST_NOW);
  await RedisClient.execute("FLUSHDB");
});

// A response that differs from openapi/v1.json fails the test that received it.
afterEach(() => {
  setClock(null);
  const found = violations.splice(0);
  expect(found, "responses that do not match the OpenAPI spec").toEqual([]);
});

afterAll(async () => {
  await RedisClient.disconnect();
});
