// A booking that is cancelled stays on record, so the club keeps its history.
// PENDING only exists for a moment while the hours are being claimed and is never listed.
enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}
export default BookingStatus;
