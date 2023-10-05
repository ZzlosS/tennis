import EnemyRequestDto from "../dtos/enemyRequestDto";
import { EnemyRequest } from "../entities/requestEnemy";
import CreateEnemyRequest from "../requests/createEnemyRequest";
import { enemyRequestSchema } from "../schemas/enemyRequestSchema";
import BaseRepository from "./baseRepository";

export default class EnemyRequestRepository extends BaseRepository<EnemyRequest> {
  constructor() {
    super(enemyRequestSchema);
  }

  async createEnemyRequest(createEnemyRequest: CreateEnemyRequest) {
    const enemyRequest = await this.createEntity();

    enemyRequest.bookingEntityID = createEnemyRequest.bookingEntityID;
    enemyRequest.playerEntityID = createEnemyRequest.playerEntityID;
    enemyRequest.numberOfPlayersNeeded = createEnemyRequest.numberOfPlayersNeeded;
    enemyRequest.active = true;
    enemyRequest.acceptedBy = [];

    return await this.repository.save(enemyRequest);
  }

  async enemyRequestAccepted(requestEntityID: string, playerEntityID: string) {
    await this.initializeRepository();
    const enemyRequest = await this.repository.fetch(requestEntityID);

    enemyRequest.acceptedBy.push(playerEntityID);
    
    if (enemyRequest.acceptedBy.length == enemyRequest.numberOfPlayersNeeded) {
      enemyRequest.active = false;
    }
    
    enemyRequest.acceptedBy = [...new Set(enemyRequest.acceptedBy)];

    return await this.repository.save(enemyRequest);
  }

  async allActiveEnemyRequests() {
    await this.initializeRepository();
    return await this.repository.search().where("active").true().return.all();
  }

  async allInactiveEnemyRequests() {
    await this.initializeRepository();
    return await this.repository.search().where("active").false().return.all();
  }
}
