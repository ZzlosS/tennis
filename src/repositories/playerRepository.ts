import PlayerDto from "../dtos/playerDto";
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

  async assignRacketToPlayer(player: Player, racketEID: string): Promise<string> {
    if (!player.rackets.includes(racketEID)) {
      player.rackets.push(racketEID);
    }
    
    return await this.save(player);
  }

  async createPlayer(dto: PlayerDto) {
    const player = await this.createEntity();

    player.firstName = dto.firstName;
    player.lastName = dto.lastName;
    player.email = dto.email;
    player.password = dto.password;
    player.nickname = dto.nickname;
    player.level = dto.level;
    player.address = dto.address;
    player.city = dto.city;
    player.country = dto.country;
    
    return await this.save(player);
  }
}
