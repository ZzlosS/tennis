import BaseEntity from "./baseEntity";

type Club = BaseEntity & {
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  currency: string;
  admins: string[];
  // IANA name, for example Europe/Belgrade.
  timeZone: string;
  // JSON text of OpeningHours.
  openingHours: string;
  // A player cannot cancel closer to the start than this many hours. Club admins always can.
  cancelCutoffHours: number;
  // "YYYY-MM-DD", the last day a season booking runs to. Empty when not set.
  seasonEndsOn: string;
};

export { Club };
