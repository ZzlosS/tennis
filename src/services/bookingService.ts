import { ulid } from "ulid";
import { COURT_NO_CLUB } from "../consts";
import { Booking } from "../entities/booking";
import { Club } from "../entities/club";
import { Court } from "../entities/court";
import BookingStatus from "../enums/bookingStatus";
import BookingType from "../enums/bookingType";
import SlotStatus from "../enums/slotStatus";
import AppError, { ConflictError, ValidationError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import { Money, toMoney } from "../http/money";
import BookingRepository from "../repositories/bookingRepository";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import PartnerRequestRepository from "../repositories/partnerRequestRepository";
import SlotRepository, { makeHolder, ParsedHolder, SlotRef } from "../repositories/slotRepository";
import BookingCreateRequest from "../requests/bookingCreateRequest";
import UpdateBookingRequest from "../requests/updateBookingRequest";
import { isAdmin, isClubAdmin } from "./access";
import { now } from "./clock";
import { CourtSchedule, scheduleOf } from "./courtSchedule";
import { addLocalDays, HOUR_MS, isOpenAt, localDate, localDayRange, localParts, utcHours } from "./time";
import { AuthUser } from "./tokenService";

const MAX_HOURS = 24;
const MAX_DAYS_AHEAD = 90;
// A "month" booking is four weekly bookings. A "season" booking runs to the club's season end, or this many weeks.
const MONTH_WEEKS = 4;
const DEFAULT_SEASON_WEEKS = 12;
const MAX_SEASON_WEEKS = 52;
// A booking that stays PENDING longer than this was left behind by a crash.
const PENDING_TTL_MS = 60_000;

interface Occurrence {
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilitySlotData {
  startsAt: Date;
  endsAt: Date;
  localTime: string;
  status: SlotStatus;
}

const hoursOf = (occurrence: Occurrence) => (occurrence.endsAt.getTime() - occurrence.startsAt.getTime()) / HOUR_MS;

// Everything about booking a court that has to hold together: the rules, the hours in Redis and the records.
export default class BookingService {
  private bookings = new BookingRepository();
  private courts = new CourtRepository();
  private clubs = new ClubRepository();
  private slots = new SlotRepository();
  private partnerRequests = new PartnerRequestRepository();

  async clubOf(court: Court): Promise<Club | null> {
    if (!court.club || court.club === COURT_NO_CLUB) {
      return null;
    }
    const club = await this.clubs.findByEntityID(court.club);
    return club.uuid != null && !club.deleted ? club : null;
  }

  // Does a holder of an hour still stand for something real? An hour held by a cancelled or missing booking is free.
  async isLive(holder: ParsedHolder): Promise<boolean> {
    if (holder.kind === "b") {
      const booking = await this.bookings.findByEntityID(holder.id);
      if (booking.uuid == null || booking.deleted || booking.status === BookingStatus.CANCELLED) {
        return false;
      }
      if (booking.status === BookingStatus.PENDING) {
        return Date.now() - (booking.createdAt ?? 0) < PENDING_TTL_MS;
      }
      return true;
    }
    return true;
  }

  // The first occurrence plus the weekly ones, at the same wall-clock time in the court's zone.
  private occurrences(type: BookingType, startsAt: Date, endsAt: Date, schedule: CourtSchedule): Occurrence[] {
    const list: Occurrence[] = [{ startsAt, endsAt }];
    if (type === BookingType.ONE_TIME) {
      return list;
    }
    const weeks = type === BookingType.MONTH ? MONTH_WEEKS : MAX_SEASON_WEEKS;
    for (let week = 1; week < weeks; week++) {
      const next = addLocalDays(startsAt, 7 * week, schedule.timeZone);
      if (type === BookingType.SEASON) {
        const beyondSeason = schedule.seasonEndsOn
          ? localDate(next, schedule.timeZone) > schedule.seasonEndsOn
          : week >= DEFAULT_SEASON_WEEKS;
        if (beyondSeason) {
          break;
        }
      }
      list.push({ startsAt: next, endsAt: addLocalDays(endsAt, 7 * week, schedule.timeZone) });
    }
    return list;
  }

  // The rules every booking must meet, new or moved.
  private check(schedule: CourtSchedule, occurrences: Occurrence[]) {
    if (!schedule.active) {
      throw new AppError(409, ErrorCode.COURT_CLOSED, "This court is closed");
    }
    const first = occurrences[0];
    const hours = hoursOf(first);
    if (hours <= 0 || hours > MAX_HOURS) {
      throw new ValidationError("Validation failed", {
        endsAt: [`A booking must end after it starts and last at most ${MAX_HOURS} hours`],
      });
    }
    if (first.startsAt.getTime() <= now().getTime()) {
      throw new AppError(400, ErrorCode.BOOKING_IN_PAST, "A booking must start in the future", {
        startsAt: ["Must be in the future"],
      });
    }
    if (first.startsAt.getTime() > now().getTime() + MAX_DAYS_AHEAD * 24 * HOUR_MS) {
      throw new ValidationError("Validation failed", {
        startsAt: [`A court can be booked at most ${MAX_DAYS_AHEAD} days ahead`],
      });
    }
    for (const occurrence of occurrences) {
      for (const hour of utcHours(occurrence.startsAt, occurrence.endsAt)) {
        if (!isOpenAt(schedule.openingHours, hour, schedule.timeZone)) {
          throw new AppError(400, ErrorCode.OUTSIDE_OPENING_HOURS, "The court is closed at that time", {
            startsAt: [occurrence.startsAt.toISOString()],
          });
        }
      }
    }
  }

  private refs(courtId: string, booking: Occurrence, bookingId: string): SlotRef[] {
    return utcHours(booking.startsAt, booking.endsAt).map((hour) => ({
      courtId,
      hour,
      holder: makeHolder("b", bookingId),
    }));
  }

  private slotsTaken(taken: SlotRef[]): never {
    const hours = [...new Set(taken.map((slot) => slot.hour.toISOString()))].sort();
    throw new ConflictError("That time is already booked", ErrorCode.SLOT_TAKEN, { slots: hours });
  }

  // Makes one booking, or a weekly series of them. All the hours are taken or none of them.
  async create(playerId: string, request: BookingCreateRequest): Promise<Booking[]> {
    const court = await this.courts.findByIdOrThrow(request.courtId, "Court");
    const schedule = scheduleOf(court, await this.clubOf(court));
    const startsAt = new Date(request.startsAt);
    const endsAt = new Date(request.endsAt);
    const occurrences = this.occurrences(request.bookingType, startsAt, endsAt, schedule);
    this.check(schedule, occurrences);

    const seriesId = occurrences.length > 1 ? ulid() : "";
    const pending: Booking[] = [];
    try {
      for (const occurrence of occurrences) {
        pending.push(
          await this.bookings.createPending({
            id: ulid(),
            courtId: court.entityId,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            playerId,
            bookingType: request.bookingType,
            totalPriceMinor: hoursOf(occurrence) * (court.pricePerHourMinor ?? 0),
            currency: court.currency,
            seriesId,
          })
        );
      }
    } catch (error) {
      await Promise.all(pending.map((booking) => this.bookings.discard(booking)));
      throw error;
    }

    const claims = pending.flatMap((booking) => this.refs(court.entityId, booking, booking.entityId));
    let result;
    try {
      result = await this.slots.claim(claims, [], (holder) => this.isLive(holder));
    } catch (error) {
      await Promise.all(pending.map((booking) => this.bookings.discard(booking)));
      throw error;
    }
    if (!result.ok) {
      await Promise.all(pending.map((booking) => this.bookings.discard(booking)));
      this.slotsTaken(result.taken);
    }

    try {
      for (const booking of pending) {
        await this.bookings.confirm(booking);
      }
    } catch (error) {
      await this.slots.release(claims);
      await Promise.all(pending.map((booking) => this.bookings.discard(booking)));
      throw error;
    }

    if (request.partnerRequest) {
      await this.partnerRequests.createPartnerRequest(
        { bookingId: pending[0].entityId, playersNeeded: request.partnerRequest.playersNeeded },
        playerId
      );
    }
    return pending;
  }

  // A new court, start or end for an existing booking. The new hours are taken and the old ones given back in one step.
  async reschedule(booking: Booking, update: UpdateBookingRequest): Promise<Booking> {
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError("This booking is cancelled");
    }
    const oldCourtId = booking.court;
    const court = await this.courts.findByIdOrThrow(update.courtId ?? oldCourtId, "Court");
    const schedule = scheduleOf(court, await this.clubOf(court));
    const next: Occurrence = {
      startsAt: update.startsAt ? new Date(update.startsAt) : booking.startsAt,
      endsAt: update.endsAt ? new Date(update.endsAt) : booking.endsAt,
    };
    this.check(schedule, [next]);

    const previous: Occurrence = { startsAt: booking.startsAt, endsAt: booking.endsAt };
    const claims = this.refs(court.entityId, next, booking.entityId);
    const kept = new Set(claims.map((slot) => `${slot.courtId}|${slot.hour.getTime()}`));
    const releases = this.refs(oldCourtId, previous, booking.entityId).filter(
      (slot) => !kept.has(`${slot.courtId}|${slot.hour.getTime()}`)
    );

    const result = await this.slots.claim(claims, releases, (holder) => this.isLive(holder));
    if (!result.ok) {
      this.slotsTaken(result.taken);
    }

    try {
      await this.bookings.updateBooking(booking, update, {
        totalPriceMinor: hoursOf(next) * (court.pricePerHourMinor ?? 0),
        currency: court.currency,
      });
    } catch (error) {
      // Put the hours back as they were.
      await this.slots.claim(this.refs(oldCourtId, previous, booking.entityId), claims, (holder) =>
        this.isLive(holder)
      );
      throw error;
    }
    return booking;
  }

  // Who may cancel without the cut-off: the club's admins, the owner of a court without a club, and ADMIN.
  private async isPrivileged(actor: AuthUser, court: Court, club: Club | null): Promise<boolean> {
    return isAdmin(actor) || (club ? isClubAdmin(actor, club) : court.ownerId === actor.id);
  }

  // Cancels the booking, or with `series` this one and every later one made with it.
  // A player cancelling their own booking must do so before the club's cut-off.
  async cancel(
    actor: AuthUser,
    booking: Booking,
    series: boolean,
    options: { skipCutoff?: boolean } = {}
  ): Promise<Booking> {
    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }
    const court = await this.courts.findByEntityID(booking.court);
    const club = await this.clubOf(court);
    if (!options.skipCutoff && !(await this.isPrivileged(actor, court, club))) {
      const { cancelCutoffHours } = scheduleOf(court, club);
      if (booking.startsAt.getTime() - now().getTime() < cancelCutoffHours * HOUR_MS) {
        throw new AppError(
          409,
          ErrorCode.CANCEL_TOO_LATE,
          `A booking can be cancelled up to ${cancelCutoffHours} hours before it starts`
        );
      }
    }

    let targets = [booking];
    if (series && booking.seriesId) {
      const sameSeries = await this.bookings.findBookings({ seriesId: booking.seriesId });
      targets = sameSeries.filter((other) => other.startsAt.getTime() >= booking.startsAt.getTime());
    }
    for (const target of targets) {
      await this.bookings.markCancelled(target, actor.id);
      await this.slots.release(this.refs(target.court, target, target.entityId));
      await this.partnerRequests.deleteForBooking(target.entityId);
    }
    return booking;
  }

  // Removes a booking altogether (the DELETE route).
  async remove(booking: Booking): Promise<void> {
    await this.bookings.deleteEntity(booking.entityId);
    await this.slots.release(this.refs(booking.court, booking, booking.entityId));
    await this.partnerRequests.deleteForBooking(booking.entityId);
  }

  // Each hour of one local day of a court, as a player sees it.
  async availability(
    court: Court,
    date: string
  ): Promise<{ schedule: CourtSchedule; price: Money | null; slots: AvailabilitySlotData[] }> {
    const schedule = scheduleOf(court, await this.clubOf(court));
    const { start, end } = localDayRange(date, schedule.timeZone);
    const hours = utcHours(start, end);

    const days = new Map<string, Map<number, string>>();
    for (const day of new Set(hours.map((hour) => hour.toISOString().slice(0, 10)))) {
      days.set(day, await this.slots.readDay(court.entityId, day));
    }

    const slots = await Promise.all(
      hours.map(async (hour): Promise<AvailabilitySlotData> => {
        const holder = days.get(hour.toISOString().slice(0, 10))?.get(hour.getUTCHours());
        let status = SlotStatus.FREE;
        if (!schedule.active || !isOpenAt(schedule.openingHours, hour, schedule.timeZone)) {
          status = SlotStatus.CLOSED;
        } else if (holder) {
          const parsed = parseHolderSafe(holder);
          if (parsed && (await this.isLive(parsed))) {
            status = parsed.kind === "x" ? SlotStatus.BLOCKED : SlotStatus.BOOKED;
          }
        }
        if (status === SlotStatus.FREE && hour.getTime() <= now().getTime()) {
          status = SlotStatus.CLOSED;
        }
        return {
          startsAt: hour,
          endsAt: new Date(hour.getTime() + HOUR_MS),
          localTime: `${String(localParts(hour, schedule.timeZone).hour).padStart(2, "0")}:00`,
          status,
        };
      })
    );
    return { schedule, price: toMoney(court.pricePerHourMinor, court.currency), slots };
  }
}

function parseHolderSafe(holder: string): ParsedHolder | null {
  const [kind, id] = holder.split(":");
  return (kind === "b" || kind === "x") && id ? { kind, id } : null;
}
