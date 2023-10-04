import { Tags, Route, Get, Path, Post, Body, Query } from "tsoa";
import CourtRepository from "../repositories/courtRepository";
import CourtResponse from "../responses/courtResponse";
import CourtCreateRequest from "../requests/courtCreateRequest";
import ClubRepository from "../repositories/clubRepository";
import ClubResponse from "../responses/clubResponse";
import { AssignCourtRequest } from "../requests/assignCourtRequest";

@Tags("Courts")
@Route("courts")
export default class CourtController {
    repository: CourtRepository;
    clubRepository: ClubRepository;

    constructor() {
        this.repository = new CourtRepository();
        this.clubRepository = new ClubRepository();
    }

    @Get("/all")
    async getAllCourts(): Promise<CourtResponse[]>  {
        let courts = await this.repository.findAll();
        const data = courts.map(court => {
            return {
                entityId: court.entityId,
                name: court.name,
                surface: court.surface,
                stands: court.stands,
                roof: court.roof,
                double: court.double,
                clubId: court.club,
                pricePerHour: court.pricePerHour,
            } as CourtResponse;
        });
            
        return data;
    }

    @Get("/{entityId}")
    async getById(@Path() entityId: string): Promise<CourtResponse>  {
        const court = await this.repository.findByEntityID(entityId);
        const club = await this.clubRepository.findByEntityID(court.club);

        const clubResponse = {
            name: club.name,
            address: club.address,
            description: club.description,
            city: club.city,
            country: club.country,
            courtsNumber: club.courts
        } as ClubResponse;

        return {
            entityId: court.entityId,
            name: court.name,
            surface: court.surface,
            stands: court.stands,
            roof: court.roof,
            double: court.double,
            club: clubResponse,
            clubId: court.club,
            pricePerHour: court.pricePerHour,
        } as CourtResponse;
    }

    @Post("/")
    async createCourt(@Body() createCourt: CourtCreateRequest): Promise<string>{
        let courtEntityID = await this.repository.createCourt(createCourt);
        
        return courtEntityID;
    }

    @Get("/unassigned")
    async getUnassignedCourts(): Promise<CourtResponse[]>  {
        let courts = await this.repository.findUnassignedCourts();
        const data = courts.map(court => {
            return {
                entityId: court.entityId,
                name: court.name,
                surface: court.surface,
                stands: court.stands,
                roof: court.roof,
                double: court.double,
                clubId: court.club,
                pricePerHour: court.pricePerHour,
            } as CourtResponse;
        });
            
        return data;
    }

    @Post("/assign")
    async assignCourtToClub(@Body() assignRequest: AssignCourtRequest): Promise<boolean>{
        await this.repository.assignToClub(assignRequest.courtEntityID, assignRequest.clubEntityID);
        await this.clubRepository.incrementClubCourtCount(assignRequest.clubEntityID);

        return true;
    }


    @Get("/price")
    async findByPrice(@Query() from: number, @Query() to: number): Promise<CourtResponse[]>{
        let courts = await this.repository.findByPrice(from, to);
        const data = courts.map(court => {
            return {
                entityId: court.entityId,
                name: court.name,
                surface: court.surface,
                stands: court.stands,
                roof: court.roof,
                double: court.double,
                clubId: court.club,
                pricePerHour: court.pricePerHour,
            } as CourtResponse;
        });
            
        return data;
    }
}