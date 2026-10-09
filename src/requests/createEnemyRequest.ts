// The requesting player is the logged-in user, who must own the booking.
export default interface CreateEnemyRequest {
  bookingEntityID: string;
  numberOfPlayersNeeded: number;
}
