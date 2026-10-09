import { Player } from "../entities/player";
import PlayerLevel from "../enums/playerLevel";
import Role from "../enums/role";
import RegisterRequest from "../requests/registerRequest";
import UpdatePlayerRequest from "../requests/updatePlayerRequest";
import { playerSchema } from "../schemas/playerSchema";
import RedisClient from "../services/redisClient";
import BaseRepository from "./baseRepository";

const PENDING = "pending";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const emailKey = (email: string) => `player:email:${normalizeEmail(email)}`;

export default class PlayerRepository extends BaseRepository<Player> {
  constructor() {
    super(playerSchema);
  }

  // Emails are unique through a lock key (SET NX), so two parallel sign-ups cannot both win.
  async claimEmail(email: string): Promise<boolean> {
    const result = await RedisClient.execute("SET", emailKey(email), PENDING, "NX");
    return result === "OK";
  }

  async setEmailOwner(email: string, playerId: string) {
    await RedisClient.execute("SET", emailKey(email), playerId);
  }

  async releaseEmail(email: string, playerId?: string) {
    if (playerId) {
      const owner = await RedisClient.execute("GET", emailKey(email));
      if (owner !== playerId) {
        return;
      }
    }
    await RedisClient.execute("DEL", emailKey(email));
  }

  // Returns undefined for an unknown email or a deleted player.
  async findByEmail(email: string): Promise<Player | undefined> {
    const playerId = await RedisClient.execute("GET", emailKey(email));
    if (typeof playerId !== "string" || playerId === PENDING) {
      return undefined;
    }
    const player = await this.findByEntityID(playerId);
    if (player.uuid == null || player.deleted) {
      return undefined;
    }
    return player;
  }

  async findPlayersByLevel(level: PlayerLevel): Promise<Player[]> {
    return await this.findAllByField(level, "level");
  }

  async findPlayersByCity(city: string): Promise<Player[]> {
    return await this.findAllByField(city, "city");
  }

  async assignRacketToPlayer(player: Player, racketEID: string): Promise<string> {
    if (player.rackets === null) {
      player.rackets = [];
    }

    if (!player.rackets.includes(racketEID)) {
      player.rackets.push(racketEID);
    }

    return await this.save(player);
  }

  // The password arrives already hashed. The role is never taken from the request.
  async createPlayer(registerRequest: RegisterRequest, passwordHash: string): Promise<string> {
    const player = await this.createEntity();

    player.firstName = registerRequest.firstName;
    player.lastName = registerRequest.lastName;
    player.email = normalizeEmail(registerRequest.email);
    player.password = passwordHash;
    player.role = Role.PLAYER;
    player.nickname = registerRequest.nickname ?? registerRequest.firstName;
    player.level = registerRequest.level;
    player.address = registerRequest.address;
    player.city = registerRequest.city;
    player.country = registerRequest.country;
    player.deleted = false;

    return await this.save(player);
  }

  async setRole(playerId: string, role: Role) {
    const player = await this.findByIdOrThrow(playerId, "Player");
    player.role = role;
    return await this.save(player);
  }

  async updatePlayer(entityId: string, updateRequest: UpdatePlayerRequest) {
    const player = await this.findByIdOrThrow(entityId, "Player");

    if (updateRequest.firstName) {
      player.firstName = updateRequest.firstName;
    }
    if (updateRequest.lastName) {
      player.lastName = updateRequest.lastName;
    }
    if (updateRequest.level) {
      player.level = updateRequest.level;
    }
    if (updateRequest.address) {
      player.address = updateRequest.address;
    }
    if (updateRequest.city) {
      player.city = updateRequest.city;
    }
    if (updateRequest.country) {
      player.country = updateRequest.country;
    }

    return await this.save(player);
  }

  // Deleting an account frees its email for a new sign-up.
  async deletePlayer(entityId: string) {
    const player = await this.findByIdOrThrow(entityId, "Player");
    const result = await this.deleteEntity(entityId);
    await this.releaseEmail(player.email, entityId);
    return result;
  }
}
