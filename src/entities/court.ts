import CourtSurface from "../enums/courtSurface";
import BaseEntity from "./baseEntity";

type Court = BaseEntity & {
  name: string;
  surface: CourtSurface;
  stands: boolean;
  roof: boolean;
  double: boolean;
  club: string;
  pricePerHour: number;
};

export { Court };
