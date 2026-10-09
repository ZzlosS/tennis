import { afterAll, beforeAll, beforeEach } from "vitest";
import RedisClient from "../src/services/redisClient";

beforeAll(async () => {
  await RedisClient.connect();
});

// Each test starts from an empty database.
beforeEach(async () => {
  await RedisClient.execute("FLUSHDB");
});

afterAll(async () => {
  await RedisClient.disconnect();
});
