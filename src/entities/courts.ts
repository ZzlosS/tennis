import CourtSurface from "../enums/courtSurface";
import BaseEntity from "./baseEntity";
import { Club } from "./club";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";

interface Court extends CreationDeletionInfo {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  club: Club;
}

class Court extends BaseEntity {}

export { Court };
