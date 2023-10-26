import { Request, Response, NextFunction } from "express";
import AppError, { NotFoundError } from "./appError";



const requestLogger = (request: Request, response: Response, next: NextFunction) => {
  // console.log('🚀 ~ REQUEST ~ ', request);
  next();
};

const errorLogger = (error: Error, request: Request, response: Response, next: NextFunction) => {
  console.log(`error ${error.message}`);
  next(error);
};

const errorResponder = (
  err: Error,
  request: Request,
  res: Response,
  next: NextFunction
) => {
  res.header("Content-Type", "application/json");

  if(err instanceof NotFoundError) {
    return res.status(404).json({error: err.message})
  }
  if (err instanceof AppError) {
    // Handle known application errors (e.g., validation errors)
    return res.status(err.statusCode).json({ error: err.message });
  } else {
    // Handle unexpected errors (e.g., unhandled exceptions)
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const invalidPathHandler = (request: Request, response: Response, next: NextFunction) => {
  response.status(404);
  return response.json({ message: "invalid path" });
};

export { errorLogger, errorResponder, invalidPathHandler, requestLogger };
