// What one hour of a court looks like to a player. CLOSED covers outside opening hours, a closed court and hours that are past.
enum SlotStatus {
  FREE = "FREE",
  BOOKED = "BOOKED",
  BLOCKED = "BLOCKED",
  CLOSED = "CLOSED",
}
export default SlotStatus;
