import { PartnerRequest } from "../entities/partnerRequest";
import PlayerLevel from "../enums/playerLevel";
import RequestStatus from "../enums/requestStatus";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import { PageQuery } from "../http/pagination";
import { joinRequest, leaveRequest, runScript } from "../redis/scripts";
import CreatePartnerRequest from "../requests/createPartnerRequest";
import UpdatePartnerRequest from "../requests/updatePartnerRequest";
import { partnerRequestSchema } from "../schemas/partnerRequestSchema";
import BaseRepository from "./baseRepository";

export const ANY_LEVEL = "ANY";

export interface PartnerRequestFilters {
  status: RequestStatus;
  // Requests for this level, and those open to any level.
  level?: PlayerLevel;
  // Bookings that start from this moment (ms), and before this one.
  from?: number;
  to?: number;
  // Only requests for doubles (3 more players) or only for fewer.
  doubles?: boolean;
  // Requests whose booking has started are never listed.
  startsAfter: number;
}

// The key redis-om keeps a request under, for the scripts that work on the stored JSON.
const keyOf = (id: string) => `PartnerRequest:${id}`;

export default class PartnerRequestRepository extends BaseRepository<PartnerRequest> {
  constructor() {
    super(partnerRequestSchema);
  }

  async createPartnerRequest(request: CreatePartnerRequest, playerId: string, startsAt: Date) {
    const partnerRequest = await this.createEntity();

    partnerRequest.bookingId = request.bookingId;
    partnerRequest.playerId = playerId;
    partnerRequest.playersNeeded = request.playersNeeded;
    partnerRequest.level = request.level ?? ANY_LEVEL;
    partnerRequest.startsAt = startsAt.getTime();
    partnerRequest.active = true;
    partnerRequest.joinedBy = [];

    return await this.save(partnerRequest);
  }

  // Takes a place. Two players asking for the last place together cannot both get it: the check and the write
  // happen in one step inside Redis.
  async join(requestId: string, playerId: string) {
    const result = await runScript(joinRequest, [keyOf(requestId)], [playerId]);
    switch (result) {
      case "OK":
        return;
      case "FULL":
        throw new ConflictError("This request is already full", ErrorCode.REQUEST_FULL);
      case "JOINED":
        throw new ConflictError("You have already joined this request", ErrorCode.ALREADY_JOINED);
      case "OWN":
        throw new ForbiddenError("You cannot join your own request");
      default:
        throw new NotFoundError("Request not found");
    }
  }

  async leave(requestId: string, playerId: string) {
    const result = await runScript(leaveRequest, [keyOf(requestId)], [playerId]);
    switch (result) {
      case "OK":
        return;
      case "NOT_JOINED":
        throw new ConflictError("You have not joined this request", ErrorCode.NOT_JOINED);
      default:
        throw new NotFoundError("Request not found");
    }
  }

  // Soonest booking first.
  async findPartnerRequestsPage(filters: PartnerRequestFilters, query: PageQuery) {
    return await this.findPage(
      (search) => {
        let found = search
          .where("active")
          .equals(filters.status === RequestStatus.OPEN)
          .and("startsAt")
          .greaterThan(Math.max(filters.startsAfter, filters.from ?? 0));
        if (filters.to !== undefined) {
          found = found.and("startsAt").lessThan(filters.to);
        }
        if (filters.doubles !== undefined) {
          found = filters.doubles ? found.and("playersNeeded").equals(3) : found.and("playersNeeded").lessThan(3);
        }
        if (filters.level) {
          const level = filters.level;
          found = found.and((group) => group.where("level").equals(level).or("level").equals(ANY_LEVEL));
        }
        return found;
      },
      query,
      { field: "startsAt", descending: false }
    );
  }

  // Requests a player made or joined. Upcoming ones (booking not started) soonest first, past ones newest first.
  async findForPlayer(playerId: string, options: { role?: "created" | "joined"; past: boolean; now: number }) {
    const found = await this.findAllMatching((search) => {
      if (options.role === "created") {
        return search.where("playerId").equals(playerId);
      }
      if (options.role === "joined") {
        return search.where("joinedBy").contains(playerId);
      }
      return search.where((group) => group.where("playerId").equals(playerId).or("joinedBy").contains(playerId));
    });
    const chosen = found.filter((request) =>
      options.past ? request.startsAt <= options.now : request.startsAt > options.now
    );
    return chosen.sort((a, b) => (options.past ? b.startsAt - a.startsAt : a.startsAt - b.startsAt));
  }

  // A booking that is cancelled takes the requests for it with it.
  async deleteForBooking(bookingId: string) {
    for (const request of await this.findAllByField(bookingId, "bookingId")) {
      await this.deleteEntity(request.entityId);
    }
  }

  // A booking that moves takes its requests along.
  async moveForBooking(bookingId: string, startsAt: Date) {
    for (const request of await this.findAllByField(bookingId, "bookingId")) {
      request.startsAt = startsAt.getTime();
      await this.save(request);
    }
  }

  async updatePartnerRequest(entityId: string, updateRequest: UpdatePartnerRequest, startsAt?: Date) {
    const partnerRequest = await this.findByIdOrThrow(entityId, "Request");

    if (updateRequest.bookingId) {
      partnerRequest.bookingId = updateRequest.bookingId;
      if (startsAt) {
        partnerRequest.startsAt = startsAt.getTime();
      }
    }
    if (updateRequest.playersNeeded) {
      partnerRequest.playersNeeded = updateRequest.playersNeeded;
      // Raising the number reopens a full request, and lowering it can fill one.
      partnerRequest.active = (partnerRequest.joinedBy ?? []).length < updateRequest.playersNeeded;
    }
    if (updateRequest.level) {
      partnerRequest.level = updateRequest.level;
    }

    return await this.save(partnerRequest);
  }
}
