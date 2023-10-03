import RacketLevels from "../enums/racketLevels";
import { NotFoundError } from "../errors/appError";
import PlayerRepository from "../repositories/playerRepository";
import RacketRepository from "../repositories/racketRepository";
import { Route, Get, Post, Body, Tags} from "tsoa";


export interface CreateRacketRequest {
    brand: string;
    model: string;
    year: number;
    weight: number;
    level: RacketLevels;
    headSizeInch: number;
    balance: number;
    stringPattern: string;
    recommendedStrings: string;
}

export interface AssignRequest {
    playerEid: string;
    racketEid: string;
}

export interface RacketResponse{
    brand: string;
    model: string;
    year: number;
    weight: number;
    level: RacketLevels;
    headSizeInch: number;
    balance: number;
    stringPattern: string;
    recommendedStrings: string;
}

@Tags('Rackets')
@Route("rackets")
export default class RacketController {
    repository: RacketRepository;
    playerRepository: PlayerRepository;
    userId: string; 

    constructor(userId: string) {
        this.repository = new RacketRepository();
        this.playerRepository = new PlayerRepository();
        this.userId = userId;
    }

    @Get("/")
    async getRackets(): Promise<RacketResponse[]> {
        let player = await this.playerRepository.findByEntityID(this.userId);

        if (!player.rackets) {
            throw new NotFoundError("No racket for this player!");
        }

        let rackets = await this.repository.getUserRackets(player.rackets);
       
        const data = rackets.map(racket => {
            return {
                entityId: racket.entityId,
                brand: racket.brand,
                model: racket.model,
                year: racket.year,
                weight: racket.weight,
                level: racket.level,
                headSizeInch: racket.headSizeInch,
                balance: racket.balance,
                stringPattern: racket.stringPattern,
                recommendedStrings: racket.recommendedStrings,
            } as RacketResponse;
        });

        return data;
    }


    @Get("/all")
    async getAllRackets(): Promise<RacketResponse[]>  {
        let rackets = await this.repository.findAll();
        const data = rackets.map(racket => {
            return {
                entityId: racket.entityId,
                uuid: racket.uuid,
                brand: racket.brand,
                model: racket.model,
                year: racket.year,
                weight: racket.weight,
                level: racket.level,
                headSizeInch: racket.headSizeInch,
                balance: racket.balance,
                stringPattern: racket.stringPattern,
                recommendedStrings: racket.recommendedStrings,
            } as RacketResponse;
        });
            
        return data;
    }

    @Post("/")
    async createRacket(@Body() createRacket: CreateRacketRequest): Promise<string>{
        let racketEID = await this.repository.createRacket(createRacket)
        
        return racketEID;
    }

    @Post("/assign")
    async assignRacketToPlayer(@Body() assignRequest: AssignRequest): Promise<boolean>{
        let player = await this.playerRepository.findByEntityID(assignRequest.playerEid);
        let playerEID = await this.playerRepository.assignRacketToPlayer(player, assignRequest.racketEid);

        return true;
    }
}