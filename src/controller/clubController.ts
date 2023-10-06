import { Route, Get, Post, Body, Tags, Path, Delete, Patch} from "tsoa";
import ClubRepository from "../repositories/clubRepository";
import ClubCreateRequest from "../requests/clubCreateRequest";
import ClubResponse from "../responses/clubResponse";
import CourtRepository from "../repositories/courtRepository";
import CourtResponse from "../responses/courtResponse";
import { Club } from "../entities/club";
import UpdateClubRequest from "../requests/updateClubRequest";


@Tags("Clubs")
@Route("clubs")
export default class ClubsController {
    repository: ClubRepository;
    courtRepository: CourtRepository;

    constructor() {
        this.repository = new ClubRepository();
        this.courtRepository = new CourtRepository();
    }

    @Post("/")
    async createClub(@Body() createClub: ClubCreateRequest): Promise<string>{
        let clubEID = await this.repository.createClub(createClub);
        
        return clubEID;
    }

    @Get("/all")
    async getAllClubs(): Promise<ClubResponse[]>  {
        let clubs = await this.repository.findAll();
        const data = clubs.map(async club => {
            return await this.convertClubModelToResponse(club);
        });
        
        return await Promise.all(data);
    }

    @Get("/city/{city}")
    async getClubsByCity(@Path() city: string): Promise<ClubResponse[]>  {
        const clubs = await this.repository.findClubsByCity(city);
        const data = clubs.map(async club => {
            return await this.convertClubModelToResponse(club);
        });

        return await Promise.all(data);
    }

    @Get("/{entityId}")
    async getById(@Path() entityId: string): Promise<ClubResponse>  {
        const club = await this.repository.findByEntityID(entityId);
        const clubCourts = await this.courtRepository.findClubCourts(club.entityId);
        const courts = clubCourts.map(court => {
            return {
                "name": court.name,
                "surface": court.surface,
                "stands": court.stands,
                "roof": court.roof,
                "double": court.double,
                "clubId": court.club,
                "pricePerHour": court.pricePerHour,
            } as CourtResponse
        });
        return {
            entityId: club.entityId,
            name: club.name,
            address: club.address,
            description: club.description,
            city: club.city,
            country: club.country,
            courtsNumber: club.courts,
            courts: courts
        } as ClubResponse;
    }

    @Delete("/{entityId}")
    async deleteClub(@Path() entityId: string): Promise<string> {
        return await this.repository.deleteEntity(entityId);
    }

    @Patch("/{entityId}")
    async updateClub(@Body() updateRequest: UpdateClubRequest, @Path()  entityId: string): Promise<string> {
        return await this.repository.updateClub(entityId, updateRequest);
    }

    private async convertClubModelToResponse(club: Club): Promise<ClubResponse>{
        return {
            entityId: club.entityId,
            name: club.name,
            address: club.address,
            description: club.description,
            city: club.city,
            country: club.country,
            courtsNumber: club.courts
        } as ClubResponse;
    }
}