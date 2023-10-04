
export default interface BookingResponse {
    entityId: string;
    clubName: string;
    clubAddress: string;
    clubCity: string;
    courtName: string;
    courtSurface: string;
    from: number;
    to: number;
    totalPrice: number;
    playerFirstName: string;
    playerLastName: string;
    bookingType: string;
    date: Date;
}