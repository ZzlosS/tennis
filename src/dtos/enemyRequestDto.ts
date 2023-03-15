export default interface EnemyRequestDto {
  bookingEntityID: string;
  playerEntityID: string;
  numberOfPlayersNeeded: number;
  acceptedBy: string[];
  active: boolean;
}
