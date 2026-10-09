import { Player } from "../entities/player";
import PlayerLevel from "../enums/playerLevel";
import Role from "../enums/role";
import { PageQuery } from "../http/pagination";
import RegisterRequest from "../requests/registerRequest";
import UpdatePlayerRequest from "../requests/updatePlayerRequest";
import { playerSchema } from "../schemas/playerSchema";
import RedisClient from "../services/redisClient";
import BaseRepository from "./baseRepository";

const PENDING = "pending";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const emailKey = (email: string) => `player:email:${normalizeEmail(email)}`;

// Words of a name search: letters and digits only, so nothing in it is read as query syntax.
export function nameSearchTerms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .slice(0, 5);
}

export default class PlayerRepository extends BaseRepository<Player> {
  constructor() {
    super(playerSchema);
  }

  // Every save refreshes the name the search looks in.
  async save(player: Player): Promise<string> {
    player.searchName = [player.firstName, player.lastName, player.nickname].filter(Boolean).join(" ");
    return await super.save(player);
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

  async findPlayersPage(filters: { city?: string; level?: PlayerLevel; q?: string }, query: PageQuery) {
    // Each word matches the start of a first name, last name or nickname ("mar pet" finds Marko Petrović).
    // Words of one letter are too short for a prefix search, so they must match a whole word.
    const terms = nameSearchTerms(filters.q ?? "").map((word) => (word.length > 1 ? `${word}*` : word));
    return await this.findPage((search) => {
      if (terms.length > 0) {
        search = search.where("searchName").matches(terms.join(" "));
      }
      if (filters.city) {
        search = search.where("city").equals(filters.city);
      }
      if (filters.level) {
        search = search.where("level").equals(filters.level);
      }
      return search;
    }, query);
  }

  async removeRacketFromPlayer(player: Player, racketId: string): Promise<string> {
    player.rackets = (player.rackets ?? []).filter((id) => id !== racketId);
    return await this.save(player);
  }

  async assignRacketToPlayer(player: Player, racketEID: string): Promise<string> {
    if (!player.rackets) {
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
    player.emailVerifiedAt = 0;
    player.language = registerRequest.language ?? "en";
    player.deleted = false;

    return await this.save(player);
  }

  async setPassword(playerId: string, passwordHash: string) {
    const player = await this.findByIdOrThrow(playerId, "Player");
    player.password = passwordHash;
    return await this.save(player);
  }

  async markEmailVerified(playerId: string, at: number) {
    const player = await this.findByIdOrThrow(playerId, "Player");
    player.emailVerifiedAt = at;
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
    if (updateRequest.nickname) {
      player.nickname = updateRequest.nickname;
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
    if (updateRequest.language) {
      player.language = updateRequest.language;
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
