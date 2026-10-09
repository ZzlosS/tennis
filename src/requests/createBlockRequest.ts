export default interface CreateBlockRequest {
  // ISO 8601 in UTC, on the hour.
  startsAt: string;
  endsAt: string;
  // What the hours are kept for, for example "Tournament" or "Resurfacing". Optional.
  reason?: string;
}
