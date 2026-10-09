import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../src/errors/appError";
import { errorResponder, invalidPathHandler } from "../src/errors/errorHandlers";
import { ErrorCode } from "../src/errors/codes";

// A throwaway app that throws on purpose, wired to the real error handlers.
const failing = (error: Error) => {
  const app = express();
  app.get("/fail", (_req, _res, next) => next(error));
  app.use(errorResponder);
  app.use(invalidPathHandler);
  return app;
};

describe("error responses", () => {
  it.each([
    [new NotFoundError("Court not found"), 404, ErrorCode.NOT_FOUND],
    [new ValidationError("bad", { email: ["Invalid"] }), 400, ErrorCode.VALIDATION_FAILED],
    [new UnauthorizedError(), 401, ErrorCode.UNAUTHENTICATED],
    [new ForbiddenError(), 403, ErrorCode.FORBIDDEN],
    [new ConflictError("taken", ErrorCode.EMAIL_TAKEN), 409, ErrorCode.EMAIL_TAKEN],
  ])("answers %s with %i and its code", async (error, status, code) => {
    const response = await request(failing(error)).get("/fail");
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
    expect(response.body.error.message).toBe(error.message);
  });

  it("carries field errors", async () => {
    const response = await request(failing(new ValidationError("bad", { email: ["Invalid"] }))).get("/fail");
    expect(response.body.error.fields).toEqual({ email: ["Invalid"] });
  });

  it("hides the details of a crash", async () => {
    const response = await request(failing(new Error("secret connection string"))).get("/fail");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: "INTERNAL", message: "Internal Server Error" } });
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });

  it("uses the same shape for an unknown path", async () => {
    const response = await request(failing(new Error("x"))).get("/nope");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
