import CourtSurface from "../enums/courtSurface";
import PlayerLevel from "../enums/playerLevel";
import { ErrorCode } from "../errors/codes";

export type { Money } from "../http/money";
export type { Page } from "../http/pagination";

// Small versions of a player, club and court, embedded wherever a response mentions one.
export interface PlayerSummary {
  id: string;
  nickname: string;
  level: PlayerLevel;
}

export interface ClubSummary {
  id: string;
  name: string;
  city: string;
}

export interface CourtSummary {
  id: string;
  name: string;
  surface: CourtSurface;
  // Null for a public or private court that has no club.
  clubId: string | null;
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    // Field name to the problems found with it, on VALIDATION_FAILED.
    fields?: { [field: string]: string[] };
  };
}
