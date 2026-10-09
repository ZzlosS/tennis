import { SetScore } from "../responses/matchResponse";

// Who won a set, or null when the games are level.
const setWinner = (set: SetScore): 0 | 1 | null =>
  set.firstTeam === set.secondTeam ? null : set.firstTeam > set.secondTeam ? 0 : 1;

// A set to 6 (the other side has 4 or fewer), 7-5 or 7-6 (after a tie-break).
function isNormalSet({ firstTeam, secondTeam }: SetScore): boolean {
  const high = Math.max(firstTeam, secondTeam);
  const low = Math.min(firstTeam, secondTeam);
  return (high === 6 && low <= 4) || (high === 7 && (low === 5 || low === 6));
}

// Only the deciding set may be played another way: a set with no tie-break that goes on until one side
// leads by two games, or a match tie-break to 10 points.
function isDecidingSet({ firstTeam, secondTeam }: SetScore): boolean {
  const high = Math.max(firstTeam, secondTeam);
  const low = Math.min(firstTeam, secondTeam);
  const longSet = low >= 6 && high - low === 2;
  const matchTiebreak = high >= 10 && (high === 10 ? low <= 8 : high - low === 2);
  return longSet || matchTiebreak;
}

export interface Tally {
  // Sets won by each team.
  sets: [number, number];
  // Games won by each team.
  games: [number, number];
}

export function tallyOf(sets: SetScore[]): Tally {
  const tally: Tally = { sets: [0, 0], games: [0, 0] };
  for (const set of sets) {
    const winner = setWinner(set);
    if (winner !== null) tally.sets[winner] += 1;
    tally.games[0] += set.firstTeam;
    tally.games[1] += set.secondTeam;
  }
  return tally;
}

// Which team won, or null when the score is not a finished match.
export function winnerOf(sets: SetScore[]): 0 | 1 | null {
  const { sets: won } = tallyOf(sets);
  return won[0] === won[1] ? null : won[0] > won[1] ? 0 : 1;
}

// A problem with the score, or null when it is a real, finished best-of-3 or best-of-5 match.
export function scoreProblem(sets: SetScore[]): string | null {
  const running: [number, number] = [0, 0];
  let decided = false;
  for (const [index, set] of sets.entries()) {
    const label = `Set ${index + 1}`;
    if (decided) {
      return `${label}: the match was already decided`;
    }
    const winner = setWinner(set);
    if (winner === null) {
      return `${label}: a set cannot end level`;
    }
    const last = index === sets.length - 1;
    const levelBefore = running[0] === running[1];
    if (!isNormalSet(set) && !(last && levelBefore && running[0] >= 1 && isDecidingSet(set))) {
      return `${label}: ${set.firstTeam}-${set.secondTeam} is not a finished set`;
    }
    running[winner] += 1;
    // Two sets win a best-of-3 and three sets win a best-of-5.
    if (running[winner] === 3 || (running[winner] === 2 && running[1 - winner] <= 1 && sets.length - 1 === index)) {
      decided = true;
    }
  }
  const [first, second] = running;
  const winnerSets = Math.max(first, second);
  const loserSets = Math.min(first, second);
  const finished = (winnerSets === 2 && loserSets <= 1) || (winnerSets === 3 && loserSets <= 2);
  return finished ? null : "The match is not finished: a team has to win two sets (best of 3) or three (best of 5)";
}
