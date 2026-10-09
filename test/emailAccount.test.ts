import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeMailer, setMailer } from "../src/services/mailer";
import { setClock } from "../src/services/clock";
import { api, bearer, login, registerPlayer } from "./helpers";

let mailer: FakeMailer;

beforeEach(() => {
  mailer = new FakeMailer();
  setMailer(mailer);
});
afterEach(() => setMailer(null));

// The token in the last email's link.
const tokenIn = (text: string) => decodeURIComponent(/token=([^\s&]+)/.exec(text)![1]);

describe("forgotten password", () => {
  it("emails a link that sets a new password once, and ends every session", async () => {
    const player = await registerPlayer();
    mailer.sent.length = 0;

    await api().post("/auth/forgot-password").send({ email: player.email }).expect(204);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: player.email, subject: "Reset your password" });
    const token = tokenIn(mailer.sent[0].text);

    await api().post("/auth/reset-password").send({ token, newPassword: "a-brand-new-password" }).expect(204);
    await login(player.email, "a-brand-new-password");
    await api().post("/auth/login").send({ email: player.email, password: player.password }).expect(401);
    await api().post("/auth/refresh").send({ refreshToken: player.refreshToken }).expect(401);

    const reused = await api()
      .post("/auth/reset-password")
      .send({ token, newPassword: "yet-another-password" })
      .expect(400);
    expect(reused.body.error.code).toBe("TOKEN_INVALID");
  });

  it("gives the same answer for an email nobody has, and sends nothing", async () => {
    await api().post("/auth/forgot-password").send({ email: "nobody@example.com" }).expect(204);
    expect(mailer.sent).toEqual([]);
  });

  it("writes in Serbian when asked", async () => {
    const player = await registerPlayer();
    mailer.sent.length = 0;
    await api().post("/auth/forgot-password").send({ email: player.email, language: "sr" }).expect(204);
    expect(mailer.sent[0].subject).toBe("Promena lozinke");
  });

  it("sends one email a minute at most", async () => {
    const player = await registerPlayer();
    mailer.sent.length = 0;
    await api().post("/auth/forgot-password").send({ email: player.email }).expect(204);
    await api().post("/auth/forgot-password").send({ email: player.email }).expect(204);
    expect(mailer.sent).toHaveLength(1);
  });

  it("refuses a made-up token and a weak new password", async () => {
    const bad = await api()
      .post("/auth/reset-password")
      .send({ token: "made-up", newPassword: "a-brand-new-password" })
      .expect(400);
    expect(bad.body.error.code).toBe("TOKEN_INVALID");
    await api().post("/auth/reset-password").send({ token: "made-up", newPassword: "short" }).expect(400);
  });

  it("keeps only a hash of the token in Redis", async () => {
    const player = await registerPlayer();
    mailer.sent.length = 0;
    await api().post("/auth/forgot-password").send({ email: player.email }).expect(204);
    const token = tokenIn(mailer.sent[0].text);
    const { default: RedisClient } = await import("../src/services/redisClient");
    const keys = (await RedisClient.execute("KEYS", "reset:*")) as string[];
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain(token);
  });
});

describe("email check", () => {
  it("sends a link at sign-up that confirms the address", async () => {
    const player = await registerPlayer();
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: player.email, subject: "Confirm your email address" });
    expect((await api().get("/me").set(bearer(player.accessToken)).expect(200)).body.emailVerified).toBe(false);

    const token = tokenIn(mailer.sent[0].text);
    await api().post("/auth/verify-email").send({ token }).expect(204);
    expect((await api().get("/me").set(bearer(player.accessToken)).expect(200)).body.emailVerified).toBe(true);
    await api().post("/auth/verify-email").send({ token }).expect(400);
  });

  it("can be sent again after a minute, and not before", async () => {
    const player = await registerPlayer();
    const again = () => api().post("/me/verify-email").set(bearer(player.accessToken));
    const tooSoon = await again().expect(429);
    expect(tooSoon.body.error.code).toBe("RATE_LIMITED");
    expect(tooSoon.headers["retry-after"]).toBe("60");

    // Redis keeps the real time, so the cooldown is cleared by hand instead of waiting.
    const { default: RedisClient } = await import("../src/services/redisClient");
    await RedisClient.execute("DEL", `cooldown:verify:${player.id}`);
    setClock("2026-10-09T08:05:00Z");
    await again().expect(204);
    expect(mailer.sent).toHaveLength(2);
  });

  it("is refused once the address is confirmed", async () => {
    const player = await registerPlayer();
    await api()
      .post("/auth/verify-email")
      .send({ token: tokenIn(mailer.sent[0].text) })
      .expect(204);
    await api().post("/me/verify-email").set(bearer(player.accessToken)).expect(409);
  });

  it("is also done by resetting the password through the emailed link", async () => {
    const player = await registerPlayer();
    mailer.sent.length = 0;
    await api().post("/auth/forgot-password").send({ email: player.email }).expect(204);
    await api()
      .post("/auth/reset-password")
      .send({ token: tokenIn(mailer.sent[0].text), newPassword: "a-brand-new-password" })
      .expect(204);
    const session = await login(player.email, "a-brand-new-password");
    expect((await api().get("/me").set(bearer(session.token)).expect(200)).body.emailVerified).toBe(true);
  });
});

describe("the Resend mailer", () => {
  it("posts the email to Resend with the key", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      const { ResendMailer } = await import("../src/services/mailer");
      await new ResendMailer("re_key", "Tennis <a@b.c>").send({
        to: "x@y.z",
        subject: "Hi",
        text: "t",
        html: "<p>t</p>",
      });
      expect(calls[0].url).toBe("https://api.resend.com/emails");
      expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer re_key");
      expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
        from: "Tennis <a@b.c>",
        to: ["x@y.z"],
        subject: "Hi",
      });

      globalThis.fetch = (async () => new Response("nope", { status: 422 })) as typeof fetch;
      await expect(
        new ResendMailer("re_key", "a").send({ to: "x@y.z", subject: "Hi", text: "t", html: "t" })
      ).rejects.toThrow(/422/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
