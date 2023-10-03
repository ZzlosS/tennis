import CourtResponse from "./courtResponse";

export default interface ClubResponse{
    name: string;
    address: string;
    description: string;
    city: string;
    country: string;
    courts?: CourtResponse[];
    courtsNumber: number;
}