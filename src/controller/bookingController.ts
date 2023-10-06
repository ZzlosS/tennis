import { Tags, Route, Get, Path, Post, Body, Query, Delete, Patch } from "tsoa";
import BookingRepository from "../repositories/bookingRepository";
import BookingCreateRequest from "../requests/bookingCreateRequest";
import CourtRepository from "../repositories/courtRepository";
import BookingFilterRequest from "../requests/bookingFilterRequest";
import ClubRepository from "../repositories/clubRepository";
import BookingResponse from "../responses/bookingResponse";
import PlayerRepository from "../repositories/playerRepository";
import { Booking } from "../entities/booking";
import UpdateBookingRequest from "../requests/updateBookingRequest";

@Tags("Bookings")
@Route("bookings")
export default class BookiongController {
    repository: BookingRepository;
    courtRepository: CourtRepository;
    clubRepository: ClubRepository;
    playerRepository: PlayerRepository;

    constructor() {
        this.repository = new BookingRepository();
        this.courtRepository = new CourtRepository();
        this.clubRepository = new ClubRepository();
        this.playerRepository = new PlayerRepository();
    }

    @Post("/")
    async createBooking(@Body() createBooking: BookingCreateRequest): Promise<string>{
        
        let court = await this.courtRepository.findByEntityID(createBooking.court);

        createBooking.totalPrice = (createBooking.to - createBooking.from) * court.pricePerHour;

        let bookingEntityID = await this.repository.createBooking(createBooking);
        
        return bookingEntityID;
    }

    @Get("/")
    async filterBookings(@Query() court: string, @Query() from: number, @Query() to: number, @Query() player: string, @Query() date: string): Promise<BookingResponse[]> {
        const bookings = await this.repository.findBookings({ 
            from: from,
            to: to,
            player: player,
            court: court,
            date: date,
        } as BookingFilterRequest);

        const data: BookingResponse[] = [];

        for (let index = 0; index < bookings.length; index++) {
            const booking = bookings[index];
            data.push(await this.convertBookingModelToResponse(booking));
        }
        
        return await Promise.all(data);
    }

    @Delete("/{entityId}")
    async deleteBooking(@Path() entityId: string): Promise<string> {
        return await this.repository.deleteEntity(entityId);
    }

    @Patch("/{entityId}")
    async updateBooking(@Body() updateRequest: UpdateBookingRequest, @Path()  entityId: string): Promise<string> {
        return await this.repository.updateBooking(entityId, updateRequest);
    }

    @Get('/{entityId}')
    async getByEntityId(@Path()  entityId: string): Promise<BookingResponse>{
        return await this.convertBookingModelToResponse( await this.repository.findByEntityID(entityId));
    }
    
    private async convertBookingModelToResponse(booking: Booking): Promise<BookingResponse>{
        const court = await this.courtRepository.findByEntityID(booking.court);
        const player = await this.playerRepository.findByEntityID(booking.player);
        const club = await this.clubRepository.findByEntityID(court.club);

        return {
            entityId: booking.entityId,
            clubName: club.name,
            clubAddress: club.address,
            clubCity: club.city,
            courtName: court.name,
            courtSurface: court.surface,
            from: booking.from,
            to: booking.to,
            totalPrice:  booking.totalPrice,
            playerFirstName: player.firstName,
            playerLastName: player.lastName,
            bookingType: booking.bookingType,
            date: booking.date,
        } as BookingResponse;
    }
}
