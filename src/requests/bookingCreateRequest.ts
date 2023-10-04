import BookingType from "../enums/bookingType";

export default interface BookingCreateRequest {
    court: string;
    from: number;
    to: number;
    totalPrice?: number;
    player: string;
    bookingType: BookingType;
    date: string;
}