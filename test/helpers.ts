import request from "supertest";
import { createApp } from "../src/app";

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
