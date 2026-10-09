import { Request } from "express";
import { UnauthorizedError } from "../errors/appError";
import { AuthUser } from "../services/tokenService";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// The user that the generated routes put on the request after checking the token (see tsoaAuth.ts).
export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new UnauthorizedError("Authentication required");
  }
  return req.user;
}
