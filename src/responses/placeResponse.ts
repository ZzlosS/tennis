import CourtKind from "../enums/courtKind";

// A pin on the map: a club, or a public or private court that has no club.
export default interface PlaceResponse {
  // A club's id when kind is CLUB, otherwise a court's id.
  id: string;
  kind: CourtKind;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  // Straight-line distance from the point searched around, in kilometres.
  distanceKm: number;
  // Courts the club has; 1 for a single court.
  courtCount: number;
}
