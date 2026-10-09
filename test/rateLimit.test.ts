import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { errorResponder } from "../src/errors/errorHandlers";
import { rateLimit } from "../src/middleware/rateLimit";
import { setClock } from "../src/services/clock";
import { api, raw, registerPlayer } from "./helpers";

// A small app of its own, so the limit can be tiny.
function appWithLimit(limit: number) {
  const app = express();
  app.use(rateLimit({ scope: "test", limit: () => limit }));
  app.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorResponder);
  return app;
}

describe("rate limiting", () => {
  it("answers 429 RATE_LIMITED with Retry-After once the limit is used up", async () => {
    setClock("2026-10-09T08:00:20Z");
    const app = appWithLimit(3);
    for (let i = 1; i <= 3; i++) {
      const ok = await request(app).get("/ping").expect(200);
      expect(ok.headers["ratelimit-limit"]).toBe("3");
      expect(ok.headers["ratelimit-remaining"]).toBe(String(3 - i));
    }
    const limited = await request(app).get("/ping").expect(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.headers["retry-after"]).toBe("40");
  });

  it("starts counting again in the next minute", async () => {
    setClock("2026-10-09T08:00:20Z");
    const app = appWithLimit(1);
    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(429);
    setClock("2026-10-09T08:01:00Z");
    await request(app).get("/ping").expect(200);
  });

  it("counts each token on its own", async () => {
    const app = appWithLimit(1);
    await request(app).get("/ping").set("Authorization", "Bearer one").expect(200);
    await request(app).get("/ping").set("Authorization", "Bearer two").expect(200);
    await request(app).get("/ping").set("Authorization", "Bearer one").expect(429);
  });

  it("holds back login attempts harder than the rest of the API", async () => {
    const before = config.RATE_LIMIT_AUTH_PER_MINUTE;
    config.RATE_LIMIT_AUTH_PER_MINUTE = 2;
    try {
      const player = await registerPlayer();
      const login = () => api().post("/auth/login").send({ email: player.email, password: "wrong-password" });
      await login().expect(401);
      const limited = await login().expect(429);
      expect(limited.body.error.code).toBe("RATE_LIMITED");
      await api()
        .get("/clubs")
        .set({ Authorization: `Bearer ${player.accessToken}` })
        .expect(200);
    } finally {
      config.RATE_LIMIT_AUTH_PER_MINUTE = before;
    }
  });
});

describe("request ids", () => {
  it("sends back an id on every answer, and keeps one the client sent", async () => {
    const generated = await raw().get("/health");
    expect(generated.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    const kept = await raw().get("/health").set("X-Request-Id", "abc-123");
    expect(kept.headers["x-request-id"]).toBe("abc-123");
    const replaced = await raw().get("/health").set("X-Request-Id", "bad id with spaces");
    expect(replaced.headers["x-request-id"]).not.toBe("bad id with spaces");
  });
});
