import PlayerDto from "../dtos/playerDto";
import { Player } from "../entities/player";
import PlayerLevel from "../enums/playerLevel";
import RegisterRequest from "../requests/registerRequest";
import UpdatePlayerRequest from "../requests/updatePlayerRequest";
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
    return await this.findAllByField(level, 'level');
  }

  async findPlayersByCity(city: string): Promise<Player[]> {
    return await this.findAllByField(city, 'city');
  }

  async assignRacketToPlayer(player: Player, racketEID: string): Promise<string> {
    if(player.rackets === null) {
      player.rackets = [];
    }

    if (!player.rackets.includes(racketEID)) {
      player.rackets.push(racketEID);
    }
    
    return await this.save(player);
  }

  async createPlayer(registerRequest: RegisterRequest): Promise<string> {
    const player = await this.createEntity();

    player.firstName = registerRequest.firstName;
    player.lastName = registerRequest.lastName;
    player.email = registerRequest.email;
    player.password = registerRequest.password;
    player.nickname = registerRequest.nickname;
    player.level = registerRequest.level;
    player.address = registerRequest.address;
    player.city = registerRequest.city;
    player.country = registerRequest.country;
    player.deleted = false;
    
    return await this.save(player);
  }

  async updatePlayer(entityId: string, updateRequest: UpdatePlayerRequest) {
    const player = await this.findByEntityID(entityId);

    if(updateRequest.firstName){
      player.firstName = updateRequest.firstName;
    }
    if(updateRequest.lastName){
      player.lastName = updateRequest.lastName;
    }
    if(updateRequest.level){
      player.level = updateRequest.level;
    }
    if(updateRequest.address){
      player.address = updateRequest.address;
    }
    if(updateRequest.city){
      player.city = updateRequest.city;
    }
    if(updateRequest.country){
      player.country = updateRequest.country;
    }

    return await this.save(player);
  }
}
