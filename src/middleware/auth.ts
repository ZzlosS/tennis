import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../errors/appError";
import { AuthUser, verifyAccessToken } from "../services/tokenService";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const [scheme, token] = (req.header("Authorization") ?? "").split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedError("Authentication required");
    }
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

// For routers: the user set by authenticateToken, which always runs first.
export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new UnauthorizedError("Authentication required");
  }
  return req.user;
}
