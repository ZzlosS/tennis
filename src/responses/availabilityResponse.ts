import SlotStatus from "../enums/slotStatus";
import { Money } from "../http/money";

export interface AvailabilitySlot {
  // ISO 8601 in UTC.
  startsAt: string;
  endsAt: string;
  // The hour on the court's wall clock, for example "18:00", so the app need not work out the time zone.
  localTime: string;
  status: SlotStatus;
}

export default interface AvailabilityResponse {
  courtId: string;
  // The local day asked for, "YYYY-MM-DD".
  date: string;
  timeZone: string;
  // Null when the court is free.
  pricePerHour: Money | null;
  // Every hour of the local day, in order. A day has 23 or 25 hours when the clocks change.
  slots: AvailabilitySlot[];
}
