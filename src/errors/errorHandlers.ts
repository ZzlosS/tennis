import { Request, Response, NextFunction } from "express";
import { ValidateError } from "tsoa";
import { logger } from "../logger";
import AppError, { TooManyRequestsError } from "./appError";
import { ErrorCode } from "./codes";

const requestLogger = (request: Request, response: Response, next: NextFunction) => {
  next();
};

const errorLogger = (error: Error, request: Request, response: Response, next: NextFunction) => {
  if (!(error instanceof AppError)) {
    logger.error({ err: error, requestId: request.id }, "request failed");
  }
  next(error);
};

// Every error leaves the API in one shape: { error: { code, message, fields? } }
const errorResponder = (err: Error, request: Request, res: Response, next: NextFunction) => {
  res.header("Content-Type", "application/json");

  if (err instanceof TooManyRequestsError && err.retryAfterSeconds !== undefined) {
    res.setHeader("Retry-After", String(err.retryAfterSeconds));
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
    });
  }

  // tsoa checks the types of every body, query and path value after zod has checked the rules.
  if (err instanceof ValidateError) {
    const fields: Record<string, string[]> = {};
    for (const [key, detail] of Object.entries(err.fields)) {
      const name = key.replace(/^(body|requestBody)\.?/, "") || "_";
      (fields[name] ??= []).push(detail.message);
    }
    return res.status(400).json({
      error: { code: ErrorCode.VALIDATION_FAILED, message: "Validation failed", fields },
    });
  }

  // body-parser rejects malformed JSON before any route runs
  if ((err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: ErrorCode.VALIDATION_FAILED, message: "Request body is not valid JSON" },
    });
  }

  return res.status(500).json({ error: { code: ErrorCode.INTERNAL, message: "Internal Server Error" } });
};

const invalidPathHandler = (request: Request, response: Response, next: NextFunction) => {
  return response.status(404).json({ error: { code: ErrorCode.NOT_FOUND, message: "Invalid path" } });
};

export { errorLogger, errorResponder, invalidPathHandler, requestLogger };
