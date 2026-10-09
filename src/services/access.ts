import { ForbiddenError } from "../errors/appError";
import Role from "../enums/role";
import { Club } from "../entities/club";
import { AuthUser } from "./tokenService";

export const isAdmin = (user: AuthUser) => user.role === Role.ADMIN;

// ADMIN passes every role check.
export function requireRole(user: AuthUser, ...roles: Role[]) {
  if (!isAdmin(user) && !roles.includes(user.role)) {
    throw new ForbiddenError();
  }
}

export function assertSelfOrAdmin(user: AuthUser, ownerId: string | null) {
  if (!isAdmin(user) && user.id !== ownerId) {
    throw new ForbiddenError();
  }
}

export const isClubAdmin = (user: AuthUser, club: Club) => isAdmin(user) || (club.admins ?? []).includes(user.id);

export function assertClubAdmin(user: AuthUser, club: Club) {
  if (!isClubAdmin(user, club)) {
    throw new ForbiddenError();
  }
}
