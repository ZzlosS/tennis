import CourtSurface from "../enums/courtSurface";
import BaseEntity from "./baseEntity";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";

interface Club extends CreationDeletionInfo {
  name: string;
  address: string;
  city: string;
  country: string;
  // courts: Courts[];
}

class Club extends BaseEntity {}

export { Club };
