import { afterAll, afterEach, beforeAll, beforeEach, expect } from "vitest";
import RedisClient from "../src/services/redisClient";
import { violations } from "./specValidator";

beforeAll(async () => {
  await RedisClient.connect();
});

// Each test starts from an empty database.
beforeEach(async () => {
  await RedisClient.execute("FLUSHDB");
});

// A response that differs from openapi/v1.json fails the test that received it.
afterEach(() => {
  const found = violations.splice(0);
  expect(found, "responses that do not match the OpenAPI spec").toEqual([]);
});

afterAll(async () => {
  await RedisClient.disconnect();
});
