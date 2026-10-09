import { Search } from "redis-om";
import { CourtHandover } from "../entities/courtHandover";
import HandoverStatus from "../enums/handoverStatus";
import { NotFoundError } from "../errors/appError";
import { moveStatus, runScript } from "../redis/scripts";
import { courtHandoverSchema } from "../schemas/courtHandoverSchema";
import { now } from "../services/clock";
import BaseRepository from "./baseRepository";

export default class CourtHandoverRepository extends BaseRepository<CourtHandover> {
  constructor() {
    super(courtHandoverSchema);
  }

  async createHandover(courtId: string, clubId: string, requestedBy: string) {
    const handover = await this.createEntity();
    handover.court = courtId;
    handover.club = clubId;
    handover.requestedBy = requestedBy;
    handover.status = HandoverStatus.PENDING;
    handover.decidedAt = 0;
    handover.decidedBy = "";
    return await this.save(handover);
  }

  async findPendingForCourt(courtId: string) {
    return (
      await this.findAllMatching((search) =>
        search.where("court").equals(courtId).and("status").equals(HandoverStatus.PENDING)
      )
    )[0];
  }

  // Handovers a player asked for, or that were asked of any of these clubs.
  async findForPlayerPage(playerId: string, clubIds: string[], status: HandoverStatus | undefined) {
    const all = await this.findAllMatching((search: Search<CourtHandover>) =>
      status ? search.where("status").equals(status) : search
    );
    const mine = all
      .filter((handover) => handover.requestedBy === playerId || clubIds.includes(handover.club))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return mine;
  }

  // Answers a pending handover. False when someone answered first.
  async answer(id: string, to: HandoverStatus, decidedBy: string): Promise<boolean> {
    const result = await runScript(moveStatus, [`CourtHandover:${id}`], [HandoverStatus.PENDING, to]);
    if (result === "MISSING") {
      throw new NotFoundError("Handover not found");
    }
    if (result !== "OK") {
      return false;
    }
    const handover = await this.findByIdOrThrow(id, "Handover");
    handover.decidedAt = now().getTime();
    handover.decidedBy = decidedBy;
    await this.save(handover);
    return true;
  }
}
