import { Request } from "express";
import Role from "../enums/role";
import { ForbiddenError, UnauthorizedError } from "../errors/appError";
import { AuthUser, verifyAccessToken } from "../services/tokenService";

// Called by the routes tsoa generates for every method marked @Security("jwt").
// The scopes are roles: @Security("jwt", ["CLUB_ADMIN"]) lets in CLUB_ADMIN and ADMIN. The value returned becomes req.user.
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes: string[] = []
): Promise<AuthUser> {
  if (securityName !== "jwt") {
    throw new UnauthorizedError("Authentication required");
  }

  const [scheme, token] = (request.header("Authorization") ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new UnauthorizedError("Authentication required");
  }

  const user = verifyAccessToken(token);
  if (scopes.length > 0 && user.role !== Role.ADMIN && !scopes.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}
