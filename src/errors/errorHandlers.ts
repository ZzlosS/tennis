import { Request, Response, NextFunction } from "express";
import AppError from "./appError";
import { ErrorCode } from "./codes";

const requestLogger = (request: Request, response: Response, next: NextFunction) => {
  next();
};

const errorLogger = (error: Error, request: Request, response: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`error ${error.message}`);
  }
  next(error);
};

// Every error leaves the API in one shape: { error: { code, message, fields? } }
const errorResponder = (err: Error, request: Request, res: Response, next: NextFunction) => {
  res.header("Content-Type", "application/json");

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
    });
  }

  // body-parser rejects malformed JSON before any route runs
  if ((err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: ErrorCode.VALIDATION_FAILED, message: "Request body is not valid JSON" },
    });
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }
  return res.status(500).json({ error: { code: ErrorCode.INTERNAL, message: "Internal Server Error" } });
};

const invalidPathHandler = (request: Request, response: Response, next: NextFunction) => {
  return response.status(404).json({ error: { code: ErrorCode.NOT_FOUND, message: "Invalid path" } });
};

export { errorLogger, errorResponder, invalidPathHandler, requestLogger };
