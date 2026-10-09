import { describe, expect, it } from "vitest";
import { api } from "./helpers";

describe("GET /health", () => {
  it("answers 200 without a login while Redis is reachable", async () => {
    const response = await api().get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
