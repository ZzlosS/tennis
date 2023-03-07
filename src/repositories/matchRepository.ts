import { Match } from "../entities/match";
import { matchSchema } from "../schemas/matchSchema";
import BaseRepository from "./baseRepository";

export default class MatchRepository extends BaseRepository<Match> {
  constructor() {
    super(matchSchema)
  }

  
}