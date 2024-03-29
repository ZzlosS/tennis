import { Tags, Route, Get, Path, Post, Body, Delete, Patch, Security} from "tsoa";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import MatchRepository from "../repositories/matchRepository";
import MatchResponse from "../responses/matchResponse";
import CreateMatchRequest from "../requests/createMatchRequest";
import PlayerRepository from "../repositories/playerRepository";
import { Match } from "../entities/match";
import UpdateMatchRequest from "../requests/updateMatchRequest";


@Tags("Matches")
@Route("matches")
export default class MatchController {
    repository: MatchRepository;
    courtRepository: CourtRepository;
    clubRepository: ClubRepository;
    playerRepository: PlayerRepository;

    constructor() {
        this.repository = new MatchRepository();
        this.courtRepository = new CourtRepository();
        this.clubRepository = new ClubRepository();
        this.playerRepository = new PlayerRepository();
    }

    @Get("/all")
    @Security("jwt")
    async getAllMatches(): Promise<MatchResponse[]>  {
        let matches = await this.repository.findAll();
        let data: MatchResponse[] = [];
        for (let index = 0; index < matches.length; index++) {
            data.push(await this.convertMatchModelToResponse(matches[index]));
        };
            
        return data;
    }


    @Get("/player/{entityId}")
    @Security("jwt")
    async getPlayersMatches(@Path() entityId: string): Promise<MatchResponse[]>  {
        const matches = await this.repository.findPlayerMatches(entityId);
        let data: MatchResponse[] = [];
        for (let index = 0; index < matches.length; index++) {
            data.push(await this.convertMatchModelToResponse(matches[index]));
        };
            
        return data;
    }

    @Get("/{entityId}")
    @Security("jwt")
    async getById(@Path() entityId: string): Promise<MatchResponse>  {
        const match = await this.repository.findByEntityID(entityId);
        return await this.convertMatchModelToResponse(match);
    }

    @Post("/")
    @Security("jwt")
    async createMatch(@Body() createMatch: CreateMatchRequest): Promise<string> {
        return await this.repository.createMatch(createMatch);
    }

    @Delete("/{entityId}")
    @Security("jwt")
    async deleteMatch(@Path() entityId: string): Promise<string> {
        return await this.repository.deleteEntity(entityId);
    }

    @Patch("/{entityId}")
    @Security("jwt")
    async updateMatch(@Body() updateRequest: UpdateMatchRequest, @Path()  entityId: string): Promise<string> {
        return await this.repository.updateMatch(entityId, updateRequest);
    }

    private async convertMatchModelToResponse(match: Match): Promise<MatchResponse>{
        const court = await this.courtRepository.findByEntityID(match.court);
        const club = await this.clubRepository.findByEntityID(court.club);

        let firstTeamPlayers = await Promise.all(match.firstTeam.map(async playerEntityID => (await this.playerRepository.findByEntityID(playerEntityID)).nickname));

        let secondTeamPlayers =  await Promise.all(match.secondTeam.map(async (playerEntityID) => (await this.playerRepository.findByEntityID(playerEntityID)).nickname));

        return {
            entityId: match.entityId,
            firstTeam: firstTeamPlayers,
            secondTeam: secondTeamPlayers,
            result: match.result,
            date: match.date,
            clubName: club.name,
            courtName: court.name,
            courtSurface: court.surface,
        } as MatchResponse;
    }

}