import { Request, Response, NextFunction } from "express";

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
  response.status(status).send(error.message);
};

const invalidPathHandler = (request: Request, response: Response, next: NextFunction) => {
  response.status(404);
  response.send("invalid path");
};

export { errorLogger, errorResponder, invalidPathHandler };
