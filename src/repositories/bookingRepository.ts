import { Search } from "redis-om";
import BookingDto from "../dtos/bookingDto";
import BookingFilterDto from "../dtos/bookingFilterDto";
import { Booking } from "../entities/booking";
import { bookingSchema } from "../schemas/bookingSchema";
import BaseRepository from "./baseRepository";
import BookingCreateRequest from "../requests/bookingCreateRequest";
import BookingFilterRequest from "../requests/bookingFilterRequest";
import UpdateBookingRequest from "../requests/updateBookingRequest";

export default class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super(bookingSchema);
  }
  async createBooking(createRequest: BookingCreateRequest) {
    const booking = await this.createEntity();

    booking.court = createRequest.court;
    booking.from = createRequest.from;
    booking.to = createRequest.to;
    booking.player = createRequest.player;
    booking.bookingType = createRequest.bookingType;
    booking.totalPrice = createRequest.totalPrice || 1000;
    booking.date = new Date(createRequest.date);
    
    return await this.save(booking);
  }

  async findBookings(bookingFilterDto: BookingFilterRequest) {
    await this.initializeRepository();

    let bookings = this.repository.search();
    
    if (bookingFilterDto.court) {
      bookings = bookings.where("court").equals(bookingFilterDto.court);
    }

    if (bookingFilterDto.from) {
      bookings.where("from").greaterThanOrEqualTo(bookingFilterDto.from);
    }

    if (bookingFilterDto.to) {
      bookings.where("to").lessThanOrEqualTo(bookingFilterDto.to);
    }

    if (bookingFilterDto.player) {
      bookings = bookings.where("player").equals(bookingFilterDto.player);
    }

    if (bookingFilterDto.date) {
      bookings = bookings.where("date").equals(new Date(bookingFilterDto.date));
    }

    return bookings.return.all();
  }


  async updateBooking(entityId: string, updateRequest: UpdateBookingRequest) {
    const booking = await this.findByEntityID(entityId);

    if(updateRequest.court){
      booking.court = updateRequest.court;
    }
    if(updateRequest.from){
      booking.from = updateRequest.from;
    }
    if(updateRequest.to){
      booking.to = updateRequest.to;
    }
    if(updateRequest.totalPrice){
      booking.totalPrice = updateRequest.totalPrice;
    }
    if(updateRequest.date){
      booking.date = new Date(updateRequest.date);
    }

    return await this.save(booking);
  }

}
