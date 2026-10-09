// CLUB courts belong to a club and are managed by its admins. PUBLIC and PRIVATE courts have no club:
// they belong to the player who added them, until that player hands them over to a club.
enum CourtKind {
  CLUB = "CLUB",
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}
export default CourtKind;
