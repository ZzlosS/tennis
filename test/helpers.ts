import request from "supertest";
import { createApp } from "../src/app";
import Role from "../src/enums/role";
import { grantRole } from "../src/scripts/grantRole";

export const app = createApp();

export const api = () => request(app);

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
    id: response.body.player.entityId,
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
  return { id: response.body.player.entityId, email, password, token: response.body.accessToken };
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
  if (response.status !== 200) {
    throw new Error(`createClub failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.entityId;
}

export async function createCourt(token: string, clubId?: string, overrides: Record<string, unknown> = {}) {
  const response = await api()
    .post("/courts")
    .set(bearer(token))
    .send({
      name: "Court 1",
      surface: "CLAY",
      stands: false,
      roof: false,
      double: false,
      pricePerHour: 1000,
      ...(clubId ? { clubId } : {}),
      ...overrides,
    });
  if (response.status !== 200) {
    throw new Error(`createCourt failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.entityId as string;
}

export async function createBooking(token: string, courtId: string, overrides: Record<string, unknown> = {}) {
  const response = await api()
    .post("/bookings")
    .set(bearer(token))
    .send({ court: courtId, from: 10, to: 12, bookingType: "ONE_TIME", date: "2026-11-01", ...overrides });
  if (response.status !== 200) {
    throw new Error(`createBooking failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.text;
}
