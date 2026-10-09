import { EnemyRequest } from "../entities/requestEnemy";
import { ConflictError } from "../errors/appError";
import CreateEnemyRequest from "../requests/createEnemyRequest";
import UpdateEnemyRequest from "../requests/updateEnemyRequest";
import { enemyRequestSchema } from "../schemas/enemyRequestSchema";
import BaseRepository from "./baseRepository";

export default class EnemyRequestRepository extends BaseRepository<EnemyRequest> {
  constructor() {
    super(enemyRequestSchema);
  }

  async createEnemyRequest(createEnemyRequest: CreateEnemyRequest, playerEntityID: string) {
    const enemyRequest = await this.createEntity();

    enemyRequest.bookingEntityID = createEnemyRequest.bookingEntityID;
    enemyRequest.playerEntityID = playerEntityID;
    enemyRequest.numberOfPlayersNeeded = createEnemyRequest.numberOfPlayersNeeded;
    enemyRequest.active = true;
    enemyRequest.acceptedBy = [];

    return await this.save(enemyRequest);
  }

  async enemyRequestAccepted(requestEntityID: string, playerEntityID: string) {
    const enemyRequest = await this.findByIdOrThrow(requestEntityID, "Request");

    if (!enemyRequest.active) {
      throw new ConflictError("This request is already full");
    }

    enemyRequest.acceptedBy = [...new Set([...(enemyRequest.acceptedBy ?? []), playerEntityID])];

    if (enemyRequest.acceptedBy.length >= enemyRequest.numberOfPlayersNeeded) {
      enemyRequest.active = false;
    }

    return await this.save(enemyRequest);
  }

  async allActiveEnemyRequests() {
    await this.initializeRepository();
    return this.withIds(await this.repository.search().where("active").true().and("deleted").false().return.all());
  }

  async allInactiveEnemyRequests() {
    await this.initializeRepository();
    return this.withIds(await this.repository.search().where("active").false().and("deleted").false().return.all());
  }

  async updateEnemyRequest(entityId: string, updateRequest: UpdateEnemyRequest) {
    const enemyRequest = await this.findByIdOrThrow(entityId, "Request");

    if (updateRequest.bookingEntityID) {
      enemyRequest.bookingEntityID = updateRequest.bookingEntityID;
    }
    if (updateRequest.numberOfPlayersNeeded) {
      enemyRequest.numberOfPlayersNeeded = updateRequest.numberOfPlayersNeeded;
    }

    return await this.save(enemyRequest);
  }
}
