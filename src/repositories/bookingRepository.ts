import { Search } from "redis-om";
import { Booking } from "../entities/booking";
import { PageQuery } from "../http/pagination";
import { bookingSchema } from "../schemas/bookingSchema";
import BookingCreateRequest from "../requests/bookingCreateRequest";
import UpdateBookingRequest from "../requests/updateBookingRequest";
import BaseRepository from "./baseRepository";

export interface BookingFilters {
  courtId?: string;
  playerId?: string;
  // Bookings that start at or after `from` and end at or before `to`.
  from?: Date;
  to?: Date;
}

export default class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super(bookingSchema);
  }

  async createBooking(request: BookingCreateRequest, playerId: string, totalPriceMinor: number, currency: string) {
    const booking = await this.createEntity();

    booking.court = request.courtId;
    booking.startsAt = new Date(request.startsAt);
    booking.endsAt = new Date(request.endsAt);
    booking.player = playerId;
    booking.bookingType = request.bookingType;
    booking.totalPriceMinor = totalPriceMinor;
    booking.currency = currency;

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
      if (filters.from) {
        search = search.where("startsAt").onOrAfter(filters.from);
      }
      if (filters.to) {
        search = search.where("endsAt").onOrBefore(filters.to);
      }
      return search;
    };
  }

  async findBookingsPage(filters: BookingFilters, query: PageQuery) {
    return await this.findPage(this.matching(filters), query);
  }

  // For callers that drop bookings in code before paging.
  async findBookings(filters: BookingFilters) {
    return await this.findAllMatching(this.matching(filters));
  }

  // The caller works out a new total when the court or the hours change.
  async updateBooking(
    entityId: string,
    updateRequest: UpdateBookingRequest,
    price?: { totalPriceMinor: number; currency: string }
  ) {
    const booking = await this.findByIdOrThrow(entityId, "Booking");

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
