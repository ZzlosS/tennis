import { NextFunction, Request, RequestHandler, Response } from "express";

// Runs a controller call and passes the result on, or the error to the error middleware.
export function handle(fn: (req: Request) => Promise<unknown>): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.send(await fn(req));
    } catch (error) {
      next(error);
    }
  };
}
