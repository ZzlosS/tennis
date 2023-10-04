import CourtSurface from "../enums/courtSurface";

export default interface CourtCreateRequest {
    name: string;
    surface: CourtSurface;
    stands: boolean;
    roof: boolean;
    double: boolean;
    pricePerHour: number;
}