import { Search } from "redis-om";
import { Booking } from "../entities/booking";
import BookingStatus from "../enums/bookingStatus";
import BookingType from "../enums/bookingType";
import { PageQuery } from "../http/pagination";
import { bookingSchema } from "../schemas/bookingSchema";
import UpdateBookingRequest from "../requests/updateBookingRequest";
import { now } from "../services/clock";
import BaseRepository, { Sort } from "./baseRepository";

export interface BookingFilters {
  courtId?: string;
  playerId?: string;
  seriesId?: string;
  // Bookings that start at or after `from` and end at or before `to`.
  from?: Date;
  to?: Date;
  // Bookings that end after this moment (still to be played, or running now).
  endsAfter?: Date;
  // Bookings that start before this moment.
  startsBefore?: Date;
  // Cancelled bookings are left out unless asked for.
  status?: BookingStatus;
}

export interface NewBooking {
  id: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  playerId: string;
  bookingType: BookingType;
  totalPriceMinor: number;
  currency: string;
  seriesId: string;
}

export default class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super(bookingSchema);
  }

  // Saved as PENDING under an id chosen up front, so the hours can be claimed in its name before it counts.
  async createPending(input: NewBooking): Promise<Booking> {
    const booking = await this.createEntity();

    booking.entityId = input.id;
    booking.court = input.courtId;
    booking.startsAt = input.startsAt;
    booking.endsAt = input.endsAt;
    booking.player = input.playerId;
    booking.bookingType = input.bookingType;
    booking.totalPriceMinor = input.totalPriceMinor;
    booking.currency = input.currency;
    booking.status = BookingStatus.PENDING;
    booking.seriesId = input.seriesId;
    booking.paidAt = 0;
    booking.cancelledAt = 0;
    booking.cancelledBy = "";

    await this.save(booking);
    return booking;
  }

  async confirm(booking: Booking) {
    booking.status = BookingStatus.CONFIRMED;
    return await this.save(booking);
  }

  // Gives up a booking whose hours could not be claimed.
  async discard(booking: Booking) {
    booking.deleted = true;
    booking.deletedAt = now().getTime();
    return await this.save(booking);
  }

  async markCancelled(booking: Booking, cancelledBy: string) {
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = now().getTime();
    booking.cancelledBy = cancelledBy;
    return await this.save(booking);
  }

  async setPaid(booking: Booking, paid: boolean) {
    booking.paidAt = paid ? now().getTime() : 0;
    return await this.save(booking);
  }

  private matching(filters: BookingFilters) {
    return (search: Search<Booking>) => {
      if (filters.courtId) {
        search = search.where("court").equals(filters.courtId);
      }
      if (filters.playerId) {
        search = search.where("player").equals(filters.playerId);
      }
      if (filters.seriesId) {
        search = search.where("seriesId").equals(filters.seriesId);
      }
      if (filters.from) {
        search = search.where("startsAt").onOrAfter(filters.from);
      }
      if (filters.to) {
        search = search.where("endsAt").onOrBefore(filters.to);
      }
      if (filters.endsAfter) {
        search = search.where("endsAt").after(filters.endsAfter);
      }
      if (filters.startsBefore) {
        search = search.where("startsAt").before(filters.startsBefore);
      }
      return search.where("status").equals(filters.status ?? BookingStatus.CONFIRMED);
    };
  }

  // Soonest first unless told otherwise: bookings made together are created in the same moment, so their creation time
  // cannot put them in order.
  async findBookingsPage(
    filters: BookingFilters,
    query: PageQuery,
    sort: Sort = { field: "startsAt", descending: false }
  ) {
    return await this.findPage(this.matching(filters), query, sort);
  }

  // For callers that drop bookings in code before paging.
  async findBookings(filters: BookingFilters) {
    const found = await this.findAllMatching(this.matching(filters));
    return found.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  async updateBooking(
    booking: Booking,
    updateRequest: UpdateBookingRequest,
    price?: { totalPriceMinor: number; currency: string }
  ) {
    if (updateRequest.courtId) {
      booking.court = updateRequest.courtId;
    }
    if (updateRequest.startsAt) {
      booking.startsAt = new Date(updateRequest.startsAt);
    }
    if (updateRequest.endsAt) {
      booking.endsAt = new Date(updateRequest.endsAt);
    }
    if (price) {
      booking.totalPriceMinor = price.totalPriceMinor;
      booking.currency = price.currency;
    }

    return await this.save(booking);
  }
}
