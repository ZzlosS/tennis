import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { TooManyRequestsError } from "../errors/appError";
import { logger } from "../logger";
import { now } from "../services/clock";
import RedisClient from "../services/redisClient";

export interface RateLimitOptions {
  // Part of the Redis key, so the limiters do not share counters.
  scope: string;
  // Read on every request, so a limit can be changed without rebuilding the middleware.
  limit: () => number;
  windowSeconds?: number;
  // Who is counted. Defaults to the session's token, else the IP address.
  keyOf?: (req: Request) => string;
}

// A client with a token is counted by token, so one phone does not use up the limit of everyone behind the same
// network address; anyone else is counted by IP.
export function clientKey(req: Request): string {
  const token = req.header("authorization");
  return token ? `t:${crypto.createHash("sha1").update(token).digest("hex")}` : `ip:${req.ip}`;
}

// A fixed window in Redis: INCR a counter that lives for one window. Over the limit the answer is 429 RATE_LIMITED
// with Retry-After. If Redis cannot be reached the request goes through: a broken counter must not take the API down.
export function rateLimit({ scope, limit, windowSeconds = 60, keyOf = clientKey }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const seconds = Math.floor(now().getTime() / 1000);
      const window = Math.floor(seconds / windowSeconds);
      const key = `rl:${scope}:${keyOf(req)}:${window}`;
      const count = Number(await RedisClient.execute("INCR", key));
      if (count === 1) {
        await RedisClient.execute("EXPIRE", key, windowSeconds + 1);
      }
      const max = limit();
      const retryAfter = (window + 1) * windowSeconds - seconds;
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, max - count)));
      res.setHeader("RateLimit-Reset", String(retryAfter));
      if (count > max) {
        return next(new TooManyRequestsError("Too many requests, try again later", retryAfter));
      }
    } catch (error) {
      logger.warn({ err: error, scope }, "rate limit check failed, letting the request through");
    }
    next();
  };
}
