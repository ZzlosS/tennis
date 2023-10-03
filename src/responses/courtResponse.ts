import CourtSurface from "../enums/courtSurface";

export default interface CourtResponse {
    name: string;
    surface: CourtSurface;
    stands: boolean;
    roof: boolean;
    double: boolean;
    club: string;
    pricePerHour: number;
}