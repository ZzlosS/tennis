import { COURT_NO_CLUB } from "../consts";
import { config } from "../config";
import BookingStatus from "../enums/bookingStatus";
import { Booking } from "../entities/booking";
import { logger } from "../logger";
import BookingRepository from "../repositories/bookingRepository";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import { now } from "./clock";
import { scheduleOf } from "./courtSchedule";
import Notifier from "./notifier";
import RedisClient from "./redisClient";
import { HOUR_MS } from "./time";

// Booking reminders: a sorted set of booking ids scored by the moment their reminder is due. The worker takes what
// is due, and takes it with ZREM, so even with several servers running each reminder is sent once.
const KEY = "reminders";
const CHECK_EVERY_MS = 60_000;
const BATCH = 100;

export default class ReminderService {
  private bookings = new BookingRepository();
  private courts = new CourtRepository();
  private clubs = new ClubRepository();
  private notifier = new Notifier();

  // Sets (or moves) the reminder of a booking. A booking that starts sooner than the lead time gets none.
  async schedule(booking: Booking): Promise<void> {
    const dueAt = booking.startsAt.getTime() - config.REMINDER_HOURS_BEFORE * HOUR_MS;
    if (dueAt <= now().getTime()) {
      await this.cancel(booking.entityId);
      return;
    }
    await RedisClient.execute("ZADD", KEY, dueAt, booking.entityId);
  }

  async cancel(bookingId: string): Promise<void> {
    await RedisClient.execute("ZREM", KEY, bookingId);
  }

  // Sends every reminder that is due. Returns how many were sent.
  async runDue(): Promise<number> {
    let sent = 0;
    for (;;) {
      const due = (await RedisClient.execute(
        "ZRANGEBYSCORE",
        KEY,
        "-inf",
        now().getTime(),
        "LIMIT",
        0,
        BATCH
      )) as string[];
      for (const bookingId of due) {
        // Whoever removes it owns it.
        if (Number(await RedisClient.execute("ZREM", KEY, bookingId)) === 1 && (await this.remind(bookingId))) {
          sent += 1;
        }
      }
      if (due.length < BATCH) return sent;
    }
  }

  private async remind(bookingId: string): Promise<boolean> {
    const booking = await this.bookings.findByEntityID(bookingId);
    if (
      booking.uuid == null ||
      booking.deleted ||
      booking.status !== BookingStatus.CONFIRMED ||
      booking.startsAt.getTime() <= now().getTime()
    ) {
      return false;
    }
    const court = await this.courts.findByEntityID(booking.court);
    const club = court.club && court.club !== COURT_NO_CLUB ? await this.clubs.findByEntityID(court.club) : null;
    const clubName = club && club.uuid != null ? club.name : undefined;
    await this.notifier.notify(
      [booking.player],
      "BOOKING_REMINDER",
      {
        court: court.name,
        club: clubName,
        startsAt: booking.startsAt,
        timeZone: scheduleOf(court, club && club.uuid != null ? club : null).timeZone,
      },
      { bookingId }
    );
    return true;
  }

  // Checks once a minute while the server runs. Returns a function that stops it.
  start(): () => void {
    const timer = setInterval(() => {
      this.runDue().catch((error) => logger.error({ err: error }, "could not send reminders"));
    }, CHECK_EVERY_MS);
    timer.unref();
    return () => clearInterval(timer);
  }
}
