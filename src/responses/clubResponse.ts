import CourtResponse from "./courtResponse";

export default interface ClubResponse {
  id: string;
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  // ISO 4217 code that the club's prices are in.
  currency: string;
  courtCount: number;
}

export interface ClubDetailResponse extends ClubResponse {
  courts: CourtResponse[];
}
