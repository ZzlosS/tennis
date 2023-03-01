import CourtSurface from "../enums/courtSurface";
import BaseEntity from "./baseEntity";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";

interface Club extends CreationDeletionInfo {
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  courts: number;
}

class Club extends BaseEntity {}

export { Club };
 