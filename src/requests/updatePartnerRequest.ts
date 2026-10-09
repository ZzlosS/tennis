import PlayerLevel from "../enums/playerLevel";

export default interface UpdatePartnerRequest {
  bookingId?: string;
  playersNeeded?: number;
  level?: PlayerLevel;
}
