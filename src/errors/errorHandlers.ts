import { Request, Response, NextFunction } from "express";
import AppError from "./appError";

const errorLogger = (error: Error, request: Request, response: Response, next: NextFunction) => {
  console.log(`error ${error.message}`);
  next(error);
};

const errorResponder = (
  error: AppError,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  response.header("Content-Type", "application/json");

  const status = error.statusCode || 400;
  return response.json({ message: error.message }).status(status);
};

const invalidPathHandler = (request: Request, response: Response, next: NextFunction) => {
  response.status(404);
  return response.json({ message: "invalid path" });
};

export { errorLogger, errorResponder, invalidPathHandler };
