import { ValidationError } from "../errors/appError";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface Page<T> {
  items: T[];
  // Opaque: pass it back as `cursor` to get the next page. Null on the last page.
  nextCursor: string | null;
}

export interface PageQuery {
  limit?: number;
  cursor?: string;
}

const encodeCursor = (offset: number) => Buffer.from(JSON.stringify({ o: offset })).toString("base64url");

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  try {
    const { o } = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (Number.isInteger(o) && o >= 0) {
      return o;
    }
  } catch {
    // falls through to the error below
  }
  throw new ValidationError("Validation failed", { cursor: ["Invalid cursor"] });
}

// limit and cursor are checked here, not by tsoa, so a bad value gets the same error shape as any other.
export function readPageQuery({ limit, cursor }: PageQuery): { limit: number; offset: number } {
  const size = limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(size) || size < 1 || size > MAX_LIMIT) {
    throw new ValidationError("Validation failed", { limit: [`Must be a whole number from 1 to ${MAX_LIMIT}`] });
  }
  return { limit: size, offset: decodeCursor(cursor) };
}

// Entities of one page of a search plus the cursor for the next one.
export interface PageOfEntities<T> {
  entities: T[];
  nextCursor: string | null;
}

// `rows` holds up to limit + 1 entities: the extra one only says that a next page exists.
export function closePage<T>(rows: T[], limit: number, offset: number): PageOfEntities<T> {
  return {
    entities: rows.slice(0, limit),
    nextCursor: rows.length > limit ? encodeCursor(offset + limit) : null,
  };
}

// One page of a list that was already loaded and filtered in code.
export async function pageOfArray<T, R>(
  all: T[],
  query: PageQuery,
  map: (item: T) => Promise<R> | R
): Promise<Page<R>> {
  const { limit, offset } = readPageQuery(query);
  const items = await Promise.all(all.slice(offset, offset + limit).map(map));
  return { items, nextCursor: offset + limit < all.length ? encodeCursor(offset + limit) : null };
}
