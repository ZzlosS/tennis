import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { app, raw } from "./helpers";
import { checkResponse, violations } from "./specValidator";

type Operation = {
  responses: Record<string, { content?: { "application/json": { schema: { $ref?: string; properties?: object } } } }>;
};
const spec = JSON.parse(readFileSync(join(__dirname, "../openapi/v1.json"), "utf8")) as {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
};

const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({ path, method, operation }))
);

// The routes Express really has, as "METHOD /v1/path/:param".
function expressRoutes(): string[] {
  const routes: string[] = [];
  const walk = (stack: any[]) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) {
          routes.push(`${method.toUpperCase()} ${layer.route.path}`);
        }
      } else if (layer.handle?.stack) {
        walk(layer.handle.stack);
      }
    }
  };
  walk((app as any)._router.stack);
  return routes;
}

describe("the OpenAPI contract", () => {
  it("has a route for every operation and an operation for every route", () => {
    const inSpec = operations.map(
      ({ path, method }) => `${method.toUpperCase()} /v1${path.replace(/\{(\w+)\}/g, ":$1")}`
    );
    const inExpress = expressRoutes().filter((route) => route.includes(" /v1/"));
    expect(inExpress.sort()).toEqual(inSpec.sort());
  });

  it("answers every operation in the spec instead of the unknown-path error", async () => {
    for (const { path, method } of operations) {
      const response = await (raw() as any)[method](`/v1${path.replace(/\{\w+\}/g, "x")}`);
      expect(response.body?.error?.message, `${method} ${path}`).not.toBe("Invalid path");
    }
  });

  it("serves the API under /v1 only", async () => {
    await raw().get("/clubs").expect(404);
    await raw().get("/v1/clubs").expect(401);
  });

  it("serves the spec for Swagger UI and clients", async () => {
    const response = await raw().get("/openapi/v1.json").expect(200);
    expect(response.body.openapi).toMatch(/^3\./);
  });

  it("uses one naming style: plain ids, no path filters", () => {
    const text = JSON.stringify(spec);
    expect(text).not.toMatch(/entityId|EntityID|Eid\b|Nicnames/);
    for (const { path } of operations) {
      expect(path, path).not.toMatch(/\/(all|city|level|player|inactive|price)(\/|$)/);
    }
  });

  it("paginates every collection route the same way", () => {
    const collections = operations.filter(
      ({ path, method }) =>
        method === "get" && !path.endsWith("}") && !path.startsWith("/auth") && !/\/(\{\w+\})$/.test(path)
    );
    expect(collections.length).toBeGreaterThan(5);
    for (const { path, operation } of collections) {
      const ref = operation.responses["200"].content!["application/json"].schema.$ref!;
      const schema = spec.components.schemas[ref.split("/").pop()!];
      expect(Object.keys(schema.properties ?? {}).sort(), path).toEqual(["items", "nextCursor"]);
    }
  });

  it("describes every error response with the shared error body", () => {
    for (const { path, method, operation } of operations) {
      for (const [status, response] of Object.entries(operation.responses)) {
        if (Number(status) >= 400) {
          expect(response.content?.["application/json"].schema.$ref, `${method} ${path} ${status}`).toBe(
            "#/components/schemas/ErrorBody"
          );
        }
      }
    }
    const codes = (spec.components.schemas.ErrorCode as unknown as { enum: string[] }).enum;
    expect(codes).toContain("VALIDATION_FAILED");
    expect(codes).toContain("EMAIL_TAKEN");
  });

  it("describes ids and money the same way everywhere", () => {
    const { Money } = spec.components.schemas;
    expect(Object.keys(Money.properties ?? {}).sort()).toEqual(["amountMinor", "currency"]);
    for (const name of ["PlayerResponse", "ClubResponse", "CourtResponse", "BookingResponse", "MatchResponse"]) {
      expect(Object.keys(spec.components.schemas[name].properties ?? {}), name).toContain("id");
    }
  });
});

// The spec check in test/setup.ts is only worth something if it can fail.
describe("the response checker", () => {
  const club = {
    id: "1",
    name: "TK",
    address: "a",
    description: "",
    city: "Belgrade",
    country: "Serbia",
    currency: "RSD",
    courtCount: 0,
  };
  const page = (item: object) => ({ items: [item], nextCursor: null });

  it.each([
    ["a response that matches", page(club), 200, 0],
    ["a missing field", page({ ...club, name: undefined }), 200, 1],
    ["an extra field", page({ ...club, secret: "x" }), 200, 1],
    ["a wrong type", page({ ...club, courtCount: "3" }), 200, 1],
    ["an undeclared status", page(club), 202, 1],
    ["an error without a code", { error: { message: "x" } }, 400, 1],
    ["an error with a code the spec lacks", { error: { code: "NOPE", message: "x" } }, 400, 1],
  ])("%s", (_name, body, status, expected) => {
    checkResponse("get", "/v1/clubs", status, body, JSON.stringify(body));
    expect(violations.splice(0)).toHaveLength(expected);
  });

  it("checks a nullable reference", () => {
    const booking = {
      id: "1",
      startsAt: "2026-11-01T10:00:00.000Z",
      endsAt: "2026-11-01T12:00:00.000Z",
      court: { id: "c", name: "Court", surface: "HARD", clubId: null },
      club: null,
      player: { id: "p", nickname: "n", level: "PRO" },
      totalPrice: null,
      bookingType: "ONE_TIME",
    };
    checkResponse("get", "/v1/bookings/1", 200, booking, "{}");
    expect(violations.splice(0)).toEqual([]);
    checkResponse("get", "/v1/bookings/1", 200, { ...booking, club: 5 }, "{}");
    expect(violations.splice(0)).toHaveLength(1);
  });
});
