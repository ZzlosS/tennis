import { OpeningHours } from "../responses/common";

export default interface UpdateClubRequest {
  name?: string;
  address?: string;
  description?: string;
  city?: string;
  country?: string;
  currency?: string;
  timeZone?: string;
  openingHours?: OpeningHours;
  cancelCutoffHours?: number;
  // An empty string clears it.
  seasonEndsOn?: string;
}
