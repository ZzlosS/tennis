import RequestStatus from "../enums/requestStatus";
import { ClubSummary, CourtSummary, PlayerSummary } from "./common";

export interface PartnerRequestBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  court: CourtSummary;
  club: ClubSummary | null;
}

export default interface PartnerRequestResponse {
  id: string;
  booking: PartnerRequestBooking;
  createdBy: PlayerSummary;
  playersNeeded: number;
  joined: PlayerSummary[];
  status: RequestStatus;
}
