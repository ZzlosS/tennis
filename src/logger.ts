import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "./config";

export const logger = pino({ level: config.LOG_LEVEL });

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Every request gets an id, which is sent back in X-Request-Id and put on every log line about it, so a problem
// the app reports can be found in the logs. An id sent in by the client is used if it is short and plain.
export function requestId(req: Request, res: Response, next: NextFunction) {
  const sent = req.header("x-request-id");
  req.id = sent && /^[\w.-]{1,64}$/.test(sent) ? sent : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}

// One line per request: method, path, status, time taken, and who asked once they are known.
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).id ?? crypto.randomUUID(),
  customProps: (req) => ({ userId: (req as Request).user?.id }),
  customLogLevel: (_req, res, error) =>
    error || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
  // Never log tokens, passwords or request bodies.
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url.split("?")[0] }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
