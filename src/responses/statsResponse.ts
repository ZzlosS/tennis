// What a player's confirmed matches add up to.
export default interface StatsResponse {
  matches: number;
  wins: number;
  losses: number;
  // Wins as a share of matches, 0 to 1; null before the first match.
  winRate: number | null;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}
