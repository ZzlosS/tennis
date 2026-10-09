import request, { Test } from "supertest";
import { createApp } from "../src/app";
import Role from "../src/enums/role";
import { grantRole } from "../src/scripts/grantRole";
import { checkResponse } from "./specValidator";

export const app = createApp();

type Method = "get" | "post" | "put" | "patch" | "delete" | "options";

// Paths in the tests are written without the /v1 prefix. Every response is checked against the OpenAPI spec:
// anything it does not match is collected, and test/setup.ts fails the test after it runs.
const call =
  (method: Method) =>
  (path: string): Test => {
    const test = request(app)[method](`/v1${path}`);
    const originalThen = test.then.bind(test);
    test.then = ((onFulfilled: never, onRejected: never) =>
      originalThen((response) => {
        checkResponse(method, `/v1${path}`, response.status, response.body, response.text);
        return response;
      }).then(onFulfilled, onRejected)) as typeof test.then;
    return test;
  };

export const api = () => ({
  get: call("get"),
  post: call("post"),
  put: call("put"),
  patch: call("patch"),
  delete: call("delete"),
  options: call("options"),
});

// For the few routes outside /v1 and for paths that do not exist.
export const raw = () => request(app);

let counter = 0;

export interface TestPlayer {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

// Registers a player through the real endpoint and returns their tokens.
export async function registerPlayer(overrides: Record<string, unknown> = {}): Promise<TestPlayer> {
  counter += 1;
  const email = `player${counter}-${Date.now()}@example.com`;
  const body = {
    firstName: "Test",
    lastName: `Player${counter}`,
    email,
    password: "correct-horse-battery",
    nickname: `tester${counter}`,
    level: "BEGINNER",
    address: "1 Court Street",
    city: "Belgrade",
    country: "Serbia",
    ...overrides,
  };
  const response = await api().post("/auth/register").send(body);
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`register failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return {
    id: response.body.player.id,
    email: String(body.email).toLowerCase(),
    password: String(body.password),
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface Session {
  id: string;
  email: string;
  password: string;
  token: string;
}

export async function login(email: string, password: string): Promise<Session> {
  const response = await api().post("/auth/login").send({ email, password });
  if (response.status !== 200) {
    throw new Error(`login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { id: response.body.player.id, email, password, token: response.body.accessToken };
}

// A player with a role the API cannot hand out: the role is set directly, as the grant-role script does,
// and the player logs in again to get a token that carries it.
export async function playerWithRole(role: Role, clubId?: string): Promise<Session> {
  const player = await registerPlayer();
  await grantRole(player.email, role, clubId);
  return login(player.email, player.password);
}

export async function createClub(adminToken: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const response = await api()
    .post("/clubs")
    .set(bearer(adminToken))
    .send({
      name: "TK Test",
      address: "1 Net Street",
      description: "A club",
      city: "Belgrade",
      country: "Serbia",
      ...overrides,
    });
  if (response.status !== 201) {
    throw new Error(`createClub failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.id;
}

// A court inside a club, 1000.00 an hour unless said otherwise.
export async function createCourt(token: string, clubId: string, overrides: Record<string, unknown> = {}) {
  const response = await api()
    .post(`/clubs/${clubId}/courts`)
    .set(bearer(token))
    .send({
      name: "Court 1",
      surface: "CLAY",
      stands: false,
      roof: false,
      double: false,
      pricePerHourMinor: 100000,
      ...overrides,
    });
  if (response.status !== 201) {
    throw new Error(`createCourt failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.id as string;
}

// A court with no club, owned by whoever adds it.
export async function createLooseCourt(token: string, overrides: Record<string, unknown> = {}) {
  const response = await api()
    .post("/courts")
    .set(bearer(token))
    .send({
      name: "Park court",
      surface: "HARD",
      stands: false,
      roof: false,
      double: false,
      kind: "PUBLIC",
      address: "Kalemegdan",
      city: "Belgrade",
      country: "Serbia",
      ...overrides,
    });
  if (response.status !== 201) {
    throw new Error(`createLooseCourt failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.id as string;
}

// Two hours on 1 November 2026 unless said otherwise. Returns the booking's id.
export async function createBooking(token: string, courtId: string, overrides: Record<string, unknown> = {}) {
  const response = await api()
    .post("/bookings")
    .set(bearer(token))
    .send({
      courtId,
      startsAt: "2026-11-01T10:00:00Z",
      endsAt: "2026-11-01T12:00:00Z",
      bookingType: "ONE_TIME",
      ...overrides,
    });
  if (response.status !== 201) {
    throw new Error(`createBooking failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.id as string;
}
