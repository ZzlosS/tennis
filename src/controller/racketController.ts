import { Player } from "../entities/player";
import RacketRepository from "../repositories/racketRepository";
import {  Route, Get, Post, Body, Query, Path } from "tsoa";


interface AssignRequest {
    brand: string;
    model: string;
    year: number;
    weight: number;
    level: string;
    headSizeInch: number;
    balance: number;
    stringPattern: string;
    recommendedStrings: string;
}

interface CreateRacket {
    playerEid: string;
    racketEid: string;
}


@Route("rackets")
export default class RacketController {
    repository: RacketRepository;

    constructor() {
        this.repository = new RacketRepository();
    }

    @Get("/player/{player}")
    async getPlayerRackets(@Path() playerEid: string) {

    }


    @Get("/")
    async getAllRackets() {

    }

    @Post("")
    async createRacket(@Body() createRacket: CreateRacket){
        
    }

    @Post("/assign/")
    async assignRacketToPlayer(@Body() assignRequest: AssignRequest){
        
    }
}