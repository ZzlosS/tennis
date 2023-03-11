import EnemyRequestDto from "../dtos/enemyRequestDto";
import { EnemyRequest } from "../entities/requestEnemy";
import { enemyRequestSchema } from "../schemas/enemyRequestSchema";
import BaseRepository from "./baseRepository";

export default class RequestRepository extends BaseRepository<EnemyRequest> {
  constructor() {
    super(enemyRequestSchema);
  }

  async createEnemyRequest(dto: EnemyRequestDto) {
    const enemyRequest = await this.createEntity();

    enemyRequest.bookingEntityID = dto.bookingEntityID;
    enemyRequest.playerEntityID = dto.playerEntityID;
    enemyRequest.numberOfPlayersNeeded = dto.numberOfPlayersNeeded;
    enemyRequest.active = true;
    enemyRequest.acceptedBy = [];

    return await this.repository.save(enemyRequest);
  }

  async enemyRequestAccepted(enemyRequestEntityID: string, playerEntityID: string) {
    const enemyRequest = await this.repository.fetch(enemyRequestEntityID);

    enemyRequest.acceptedBy.push(playerEntityID);
    if (enemyRequest.acceptedBy.length == enemyRequest.numberOfPlayersNeeded) {
      enemyRequest.active = true;
    }

    return await this.repository.save(enemyRequest);
  }

  async allActiveEnemyRequests() {
    return await this.repository.search().where("active").true().return.all();
  }
}
