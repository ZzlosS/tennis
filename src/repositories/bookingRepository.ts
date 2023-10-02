import { Search } from "redis-om";
import BookingDto from "../dtos/bookingDto";
import BookingFilterDto from "../dtos/bookingFilterDto";
import { Booking } from "../entities/booking";
import { bookingSchema } from "../schemas/bookingSchema";
import BaseRepository from "./baseRepository";

export default class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super(bookingSchema);
  }
  async createBooking(dto: BookingDto) {
    const booking = await this.createEntity();

    booking.court = dto.court;
    booking.from = dto.from;
    booking.to = dto.to;
    booking.totalPrice = dto.totalPrice;
    booking.player = dto.player;
    booking.bookingType = dto.bookingType;
    
    return await this.save(booking);
  }

  async findBookings(bookingFilterDto: BookingFilterDto) {

    let bookings = this.repository.search();
    
    if (bookingFilterDto.court) {
      bookings = bookings.where("court").equals(bookingFilterDto.court);
    }

    if (bookingFilterDto.from) {
      bookings.where("from").onOrAfter(new Date(bookingFilterDto.from));
    }

    if (bookingFilterDto.to) {
      bookings.where("to").onOrBefore(new Date(bookingFilterDto.to));
    }

    if (bookingFilterDto.player) {
      bookings = bookings.where("player").equals(bookingFilterDto.player);
    }

    return bookings.return.all();
  }

}
