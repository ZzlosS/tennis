import { Player } from "../entities/player";
import PlayerLevel from "../enums/playerLevel";
import { playerSchema } from "../schemas/playerSchema";
import BaseRepository from "./baseRepository";

export default class PlayerRepository extends BaseRepository<Player> {
  constructor() {
    super(playerSchema);
  }

  async findByEmail(email: string): Promise<Player> {
    return await this.findFirstByField(email, "email");
  }

  async findPlayersByLevel(level: PlayerLevel): Promise<Player[]> {
    return await this.findAllByField('level', level);
  }

}
