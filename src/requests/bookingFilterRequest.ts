
export default interface BookingFilterRequest {
    court: string | undefined;
    from: number | undefined;
    to: number | undefined;
    player: string | undefined;
    date: string | undefined;
  }