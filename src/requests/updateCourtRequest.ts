import CourtSurface from "../enums/courtSurface";

export default interface UpdateCourtRequest {
    name: string;
    surface: CourtSurface;
    stands: boolean;
    roof: boolean;
    double: boolean;
    pricePerHour: number;
}