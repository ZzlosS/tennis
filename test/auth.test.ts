import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { api, bearer, registerPlayer } from "./helpers";
import RedisClient from "../src/services/redisClient";
import { config } from "../src/config";

const registerBody = (email: string, extra: Record<string, unknown> = {}) => ({
  firstName: "Ana",
  lastName: "Jovic",
  email,
  password: "correct-horse-battery",
  ...extra,
});

describe("register", () => {
  it("stores a bcrypt hash, never the password", async () => {
    const player = await registerPlayer();
    const stored = (await RedisClient.execute("JSON.GET", `Player:${player.id}`, "$.password")) as string;
    expect(JSON.parse(stored)[0]).toMatch(/^\$2[aby]\$/);
    expect(stored).not.toContain(player.password);
  });

  it("returns tokens and the player, without the password", async () => {
    const response = await api().post("/auth/register").send(registerBody("Ana@Example.com"));
    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
    expect(response.body.expiresIn).toBeGreaterThan(0);
    expect(response.body.player.email).toBe("ana@example.com");
    expect(response.body.player.role).toBe("PLAYER");
    expect(JSON.stringify(response.body)).not.toContain("correct-horse-battery");
  });

  it("answers a duplicate email with 409 EMAIL_TAKEN, whatever its case", async () => {
    await api().post("/auth/register").send(registerBody("dup@example.com")).expect(201);
    const response = await api().post("/auth/register").send(registerBody("DUP@example.com"));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("creates one player when the same email registers in parallel", async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => api().post("/auth/register").send(registerBody("race@example.com")))
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 409)).toHaveLength(4);
  });

  it("ignores a role sent in the body", async () => {
    const response = await api()
      .post("/auth/register")
      .send(registerBody("sneaky@example.com", { role: "ADMIN" }));
    expect(response.status).toBe(201);
    expect(response.body.player.role).toBe("PLAYER");
  });
});

describe("login", () => {
  it("logs in with the right password, whatever the email case", async () => {
    const player = await registerPlayer();
    const response = await api()
      .post("/auth/login")
      .send({ email: player.email.toUpperCase(), password: player.password });
    expect(response.status).toBe(200);
    expect(response.body.player.entityId).toBe(player.id);
  });

  it("answers a wrong password and an unknown email with the same 401", async () => {
    const player = await registerPlayer();
    const wrongPassword = await api().post("/auth/login").send({ email: player.email, password: "wrong-password-1" });
    const unknownEmail = await api()
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password-1" });

    for (const response of [wrongPassword, unknownEmail]) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    }
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("does not let a deleted player log in", async () => {
    const player = await registerPlayer();
    await api().delete(`/players/${player.id}`).set(bearer(player.accessToken)).expect(200);
    const response = await api().post("/auth/login").send({ email: player.email, password: player.password });
    expect(response.status).toBe(401);
  });
});

describe("access tokens", () => {
  it("rejects a request with no token, a malformed header and garbage", async () => {
    for (const header of [undefined, "Bearer", "Basic abc", "Bearer not-a-jwt"]) {
      const request = api().get("/players");
      const response = await (header ? request.set("Authorization", header) : request);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects a token signed with any other secret, including the old hard-coded one", async () => {
    const player = await registerPlayer();
    for (const secret of ["lestra", "some-other-secret-some-other-secret-1234"]) {
      const forged = jwt.sign({ role: "ADMIN" }, secret, { subject: player.id, expiresIn: "1h" });
      const response = await api().get("/players").set(bearer(forged));
      expect(response.status).toBe(401);
    }
  });

  it("rejects an unsigned (alg none) token", async () => {
    const player = await registerPlayer();
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: player.id, role: "ADMIN" })).toString("base64url");
    const response = await api()
      .get("/players")
      .set(bearer(`${header}.${payload}.`));
    expect(response.status).toBe(401);
  });

  it("answers an expired token with 401 TOKEN_EXPIRED", async () => {
    const player = await registerPlayer();
    const expired = jwt.sign({ role: "PLAYER" }, config.JWT_SECRET, { subject: player.id, expiresIn: -10 });
    const response = await api().get("/players").set(bearer(expired));
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("accepts the token it issued", async () => {
    const player = await registerPlayer();
    await api().get("/players").set(bearer(player.accessToken)).expect(200);
  });
});

describe("refresh and logout", () => {
  it("rotates the refresh token: the old one stops working", async () => {
    const player = await registerPlayer();
    const first = await api().post("/auth/refresh").send({ refreshToken: player.refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(player.refreshToken);
    await api().get("/players").set(bearer(first.body.accessToken)).expect(200);

    const replay = await api().post("/auth/refresh").send({ refreshToken: player.refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects an unknown refresh token", async () => {
    await api().post("/auth/refresh").send({ refreshToken: "nope" }).expect(401);
  });

  it("logout kills the refresh token", async () => {
    const player = await registerPlayer();
    await api().post("/auth/logout").send({ refreshToken: player.refreshToken }).expect(204);
    await api().post("/auth/refresh").send({ refreshToken: player.refreshToken }).expect(401);
  });

  it("does not refresh a deleted player", async () => {
    const player = await registerPlayer();
    await api().delete(`/players/${player.id}`).set(bearer(player.accessToken)).expect(200);
    await api().post("/auth/refresh").send({ refreshToken: player.refreshToken }).expect(401);
  });
});
