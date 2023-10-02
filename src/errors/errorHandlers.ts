import { Request, Response, NextFunction } from "express";
import AppError from "./appError";



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

  // const status = error.statusCode || 400;
  // return response.json({ message: error.message }).status(status);


  if (err instanceof AppError) {
    // Handle known application errors (e.g., validation errors)
    res.status(err.statusCode).json({ error: err.message });
  } else {
    // Handle unexpected errors (e.g., unhandled exceptions)
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const invalidPathHandler = (request: Request, response: Response, next: NextFunction) => {
  response.status(404);
  return response.json({ message: "invalid path" });
};

export { errorLogger, errorResponder, invalidPathHandler, requestLogger };
