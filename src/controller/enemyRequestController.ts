import { EnemyRequest } from "../entities/requestEnemy";
import BookingRepository from "../repositories/bookingRepository";
import PlayerRepository from "../repositories/playerRepository";
import EnemyRequestRepository from "../repositories/requestRepository";
import CreateEnemyRequest from "../requests/createEnemyRequest";
import { Tags, Route, Get, Path, Post, Body, Delete, Patch, Security} from "tsoa";
import EnemyRequestResponse from "../responses/enemyRequestResponse";
import CourtRepository from "../repositories/courtRepository";
import AcceptEnemyRequest from "../requests/acceptEnemyRequest";
import UpdateEnemyRequest from "../requests/updateEnemyRequest";


@Tags("Requests")
@Route("requests")
export default class EnemyRequestController {
    repository: EnemyRequestRepository;
    playerRepository: PlayerRepository;
    bookingRepository: BookingRepository;
    courtRepository: CourtRepository;
    
    constructor() {
        this.repository = new EnemyRequestRepository();
        this.bookingRepository = new BookingRepository();
        this.playerRepository = new PlayerRepository();
        this.playerRepository = new PlayerRepository();
        this.courtRepository = new CourtRepository();
    }

    @Post("/")
    @Security("jwt")
    async createRequest(@Body() createRequest: CreateEnemyRequest){
        return await this.repository.createEnemyRequest(createRequest);
    }

    @Post("/accept")
    @Security("jwt")
    async acceptRequest(@Body() acceptRequest: AcceptEnemyRequest){
        return await this.repository.enemyRequestAccepted(acceptRequest.requestEntityID, acceptRequest.playerEntityID);
    }

    @Get("/")
    @Security("jwt")
    async getActiveRequests(){
        const requests = await this.repository.allActiveEnemyRequests();
        let data: EnemyRequestResponse[] = [];
        for (let index = 0; index < requests.length; index++) {
            data.push(await this.convertMatchModelToResponse(requests[index]));
        };
            
        return data;

    }

    @Get("/inactive")
    @Security("jwt")
    async getInactiveRequests(){
        const requests = await this.repository.allInactiveEnemyRequests();
        let data: EnemyRequestResponse[] = [];
        for (let index = 0; index < requests.length; index++) {
            data.push(await this.convertMatchModelToResponse(requests[index]));
        };
            
        return data;

    }

    private async convertMatchModelToResponse(enemyRequest: EnemyRequest): Promise<EnemyRequestResponse>{
        const booking = await this.bookingRepository.findByEntityID(enemyRequest.bookingEntityID);
        const player = await this.playerRepository.findByEntityID(enemyRequest.playerEntityID);
        const court = await this.courtRepository.findByEntityID(booking.court);
        const acceptedPlayerNicnames = await Promise.all(enemyRequest.acceptedBy.map(async playerEntityID => (await this.playerRepository.findByEntityID(playerEntityID)).nickname));

        return {
            entityId: enemyRequest.entityId,
            bookingEntityID: enemyRequest.bookingEntityID,
            courtEntityId: booking.court,
            date: booking.date,
            totalPrice: booking.totalPrice,
            from: booking.from,
            to: booking.to,
            playerNickname: player.nickname,
            numberOfPlayersNeeded: enemyRequest.numberOfPlayersNeeded,
            acceptedPlayerNicnames: acceptedPlayerNicnames,
            active: enemyRequest.active,
            courtName: court.name,
            courtSurface: court.surface,
        } as EnemyRequestResponse;
    }

    @Delete("/{entityId}")
    @Security("jwt")
    async deleteEnemyRequest(@Path() entityId: string): Promise<string> {
        return await this.repository.deleteEntity(entityId);
    }
    
    @Get("/{entityId}")
    @Security("jwt")
    async getEnemyRequest(@Path() entityId: string): Promise<EnemyRequestResponse> {
        return await this.convertMatchModelToResponse(await this.repository.findByEntityID(entityId));
    }
    
    @Patch("/{entityId}")
    @Security("jwt")
    async updateEnemyRequest(@Body() updateRequest: UpdateEnemyRequest, @Path()  entityId: string): Promise<string> {
        return await this.repository.updateEnemyRequest(entityId, updateRequest);
    }
}