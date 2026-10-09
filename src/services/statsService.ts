import { Match } from "../entities/match";
import MatchStatus from "../enums/matchStatus";
import MatchRepository, { parseSets } from "../repositories/matchRepository";
import StatsResponse from "../responses/statsResponse";
import RedisClient from "./redisClient";
import { tallyOf, winnerOf } from "./tennisScore";

const keyOf = (playerId: string) => `stats:${playerId}`;
const FIELDS = ["matches", "wins", "losses", "setsWon", "setsLost", "gamesWon", "gamesLost"] as const;

// Running totals per player, kept in a Redis hash each: counters are added to when a match is confirmed,
// so reading the stats never has to go through the player's matches.
export default class StatsService {
  // Adds a confirmed match to every player in it (direction 1), or takes it out again (direction -1).
  async apply(match: Match, direction: 1 | -1): Promise<void> {
    const sets = parseSets(match);
    const winner = winnerOf(sets);
    const tally = tallyOf(sets);
    for (const team of [0, 1] as const) {
      const own = team;
      const other = 1 - team;
      const counts: Record<(typeof FIELDS)[number], number> = {
        matches: 1,
        wins: winner === own ? 1 : 0,
        losses: winner === other ? 1 : 0,
        setsWon: tally.sets[own],
        setsLost: tally.sets[other],
        gamesWon: tally.games[own],
        gamesLost: tally.games[other],
      };
      for (const playerId of team === 0 ? match.firstTeam : match.secondTeam) {
        for (const field of FIELDS) {
          if (counts[field] !== 0) {
            await RedisClient.execute("HINCRBY", keyOf(playerId), field, counts[field] * direction);
          }
        }
      }
    }
  }

  async get(playerId: string): Promise<StatsResponse> {
    const raw = (await RedisClient.execute("HGETALL", keyOf(playerId))) as Record<string, string> | string[] | null;
    const hash: Record<string, number> = {};
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i += 2) hash[raw[i]] = Number(raw[i + 1]);
    } else if (raw) {
      for (const [field, value] of Object.entries(raw)) hash[field] = Number(value);
    }
    const count = (field: (typeof FIELDS)[number]) => hash[field] ?? 0;
    const matches = count("matches");
    return {
      matches,
      wins: count("wins"),
      losses: count("losses"),
      winRate: matches === 0 ? null : count("wins") / matches,
      setsWon: count("setsWon"),
      setsLost: count("setsLost"),
      gamesWon: count("gamesWon"),
      gamesLost: count("gamesLost"),
    };
  }

  // Throws the counters away and adds up every confirmed match again.
  async rebuild(): Promise<number> {
    const keys = (await RedisClient.execute("KEYS", "stats:*")) as string[];
    for (const key of keys) {
      await RedisClient.execute("DEL", key);
    }
    const matches = (await new MatchRepository().findAll()).filter((match) => match.status === MatchStatus.CONFIRMED);
    for (const match of matches) {
      await this.apply(match, 1);
    }
    return matches.length;
  }
}
