// The creator is the logged-in user, who must own the booking.
export default interface CreatePartnerRequest {
  bookingId: string;
  playersNeeded: number;
}
