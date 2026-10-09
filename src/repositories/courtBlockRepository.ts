import { CourtBlock } from "../entities/courtBlock";
import { PageQuery } from "../http/pagination";
import { courtBlockSchema } from "../schemas/courtBlockSchema";
import { now } from "../services/clock";
import BaseRepository from "./baseRepository";

export interface NewBlock {
  id: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdBy: string;
}

export default class CourtBlockRepository extends BaseRepository<CourtBlock> {
  constructor() {
    super(courtBlockSchema);
  }

  // Saved under an id chosen up front, so the hours can be held in its name.
  async createBlock(input: NewBlock): Promise<CourtBlock> {
    const block = await this.createEntity();
    block.entityId = input.id;
    block.court = input.courtId;
    block.startsAt = input.startsAt;
    block.endsAt = input.endsAt;
    block.reason = input.reason;
    block.createdBy = input.createdBy;
    await this.save(block);
    return block;
  }

  async discard(block: CourtBlock) {
    block.deleted = true;
    block.deletedAt = now().getTime();
    return await this.save(block);
  }

  // Blocks of one court that have not ended by `endsAfter`, soonest first.
  async findCourtBlocksPage(courtId: string, endsAfter: Date, query: PageQuery) {
    return await this.findPage(
      (search) => search.where("court").equals(courtId).and("endsAt").after(endsAfter),
      query,
      { field: "startsAt", descending: false }
    );
  }
}
