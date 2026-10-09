import { describe, expect, it } from "vitest";
import { api, raw } from "./helpers";

describe("CORS", () => {
  it("lets an allowed origin call the API", async () => {
    const response = await api()
      .options("/auth/login")
      .set("Origin", "http://localhost:8081")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
    expect(response.headers["access-control-allow-headers"]).toContain("authorization");
  });

  it("gives no access to any other origin", async () => {
    const response = await raw().get("/").set("Origin", "https://evil.example.com");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
