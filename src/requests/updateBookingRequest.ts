export default interface UpdateBookingRequest {    
    court: string;
    from: number;
    to: number;
    totalPrice: number;
    date: Date;
}