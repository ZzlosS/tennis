import { PartnerRequest } from "../entities/partnerRequest";
import RequestStatus from "../enums/requestStatus";
import { ConflictError } from "../errors/appError";
import { PageQuery } from "../http/pagination";
import CreatePartnerRequest from "../requests/createPartnerRequest";
import UpdatePartnerRequest from "../requests/updatePartnerRequest";
import { partnerRequestSchema } from "../schemas/partnerRequestSchema";
import BaseRepository from "./baseRepository";

export default class PartnerRequestRepository extends BaseRepository<PartnerRequest> {
  constructor() {
    super(partnerRequestSchema);
  }

  async createPartnerRequest(request: CreatePartnerRequest, playerId: string) {
    const partnerRequest = await this.createEntity();

    partnerRequest.bookingId = request.bookingId;
    partnerRequest.playerId = playerId;
    partnerRequest.playersNeeded = request.playersNeeded;
    partnerRequest.active = true;
    partnerRequest.joinedBy = [];

    return await this.save(partnerRequest);
  }

  async join(requestId: string, playerId: string) {
    const partnerRequest = await this.findByIdOrThrow(requestId, "Request");

    if (!partnerRequest.active) {
      throw new ConflictError("This request is already full");
    }

    partnerRequest.joinedBy = [...new Set([...(partnerRequest.joinedBy ?? []), playerId])];

    if (partnerRequest.joinedBy.length >= partnerRequest.playersNeeded) {
      partnerRequest.active = false;
    }

    return await this.save(partnerRequest);
  }

  async findByStatusPage(status: RequestStatus, query: PageQuery) {
    return await this.findPage((search) => search.where("active").equals(status === RequestStatus.OPEN), query);
  }

  // A booking that is cancelled takes the requests for it with it.
  async deleteForBooking(bookingId: string) {
    for (const request of await this.findAllByField(bookingId, "bookingId")) {
      await this.deleteEntity(request.entityId);
    }
  }

  async updatePartnerRequest(entityId: string, updateRequest: UpdatePartnerRequest) {
    const partnerRequest = await this.findByIdOrThrow(entityId, "Request");

    if (updateRequest.bookingId) {
      partnerRequest.bookingId = updateRequest.bookingId;
    }
    if (updateRequest.playersNeeded) {
      partnerRequest.playersNeeded = updateRequest.playersNeeded;
    }

    return await this.save(partnerRequest);
  }
}
