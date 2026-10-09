import { ulid } from "ulid";
import { CourtBlock } from "../entities/courtBlock";
import { Court } from "../entities/court";
import AppError, { ConflictError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import CourtBlockRepository from "../repositories/courtBlockRepository";
import SlotRepository, { makeHolder, SlotRef } from "../repositories/slotRepository";
import CreateBlockRequest from "../requests/createBlockRequest";
import BookingService from "./bookingService";
import { now } from "./clock";
import { utcHours } from "./time";

// Keeping hours of a court free: the same hours that bookings use, held in the name of a block instead.
export default class BlockService {
  private blocks = new CourtBlockRepository();
  private slots = new SlotRepository();
  private bookingService = new BookingService();

  private refs(block: { entityId: string; court: string; startsAt: Date; endsAt: Date }): SlotRef[] {
    return utcHours(block.startsAt, block.endsAt).map((hour) => ({
      courtId: block.court,
      hour,
      holder: makeHolder("x", block.entityId),
    }));
  }

  // Holds the hours, or answers 409 SLOT_TAKEN with the hours that are already booked or blocked.
  async create(court: Court, createdBy: string, request: CreateBlockRequest): Promise<CourtBlock> {
    const startsAt = new Date(request.startsAt);
    const endsAt = new Date(request.endsAt);
    if (endsAt.getTime() <= now().getTime()) {
      throw new AppError(400, ErrorCode.BOOKING_IN_PAST, "A block must end in the future", {
        endsAt: ["Must be in the future"],
      });
    }
    const block = await this.blocks.createBlock({
      id: ulid(),
      courtId: court.entityId,
      startsAt,
      endsAt,
      reason: request.reason ?? "",
      createdBy,
    });
    try {
      const result = await this.slots.claim(this.refs(block), [], (holder) => this.bookingService.isLive(holder));
      if (!result.ok) {
        const hours = [...new Set(result.taken.map((slot) => slot.hour.toISOString()))].sort();
        throw new ConflictError("Some of those hours are already booked or blocked", ErrorCode.SLOT_TAKEN, {
          slots: hours,
        });
      }
    } catch (error) {
      await this.blocks.discard(block);
      throw error;
    }
    return block;
  }

  // Frees the hours (only those still held by this block) and forgets the block.
  async remove(block: CourtBlock): Promise<void> {
    await this.blocks.discard(block);
    await this.slots.release(this.refs(block));
  }
}
