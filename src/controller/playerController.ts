import PlayerRepository from "../repositories/playerRepository";
const jwt = require("jsonwebtoken");
import ILoginRequest from "../requests/loginRequest";
import { Route, Get, Post, Body, Path, Response, Tags, Delete, Patch, Security } from "tsoa";
import RegisterRequest from "../requests/registerRequest";
import PlayerLevel from "../enums/playerLevel";
import PlayersResponse from "../responses/playersResponse";
import AppError, { NotFoundError } from "../errors/appError";
import UpdatePlayerRequest from "../requests/updatePlayerRequest";
import { Player } from "../entities/player";

require("dotenv").config();


@Tags('Players')
@Route("players")
export default class PlayerController {
  repository: PlayerRepository;

  constructor() {
    this.repository = new PlayerRepository();
  }

  @Post("/register")
  async register(@Body() registerRequest: RegisterRequest): Promise<any> {
    const { firstName, lastName, email, password, address, city, level } = registerRequest;

    // Validate user input
    if (!(email && password && firstName && lastName)) {
      throw new AppError(400, 'All input is required!');
    }

    const existingUser = await this.repository.findByEmail(email);
    if (existingUser) {
      throw new AppError(403, 'User already exist!');
    }

    // Todo: ! Add encryption !
    const encryptedPassword = password; 
    registerRequest.password = encryptedPassword;
    
    const entityId = await this.repository.createPlayer(registerRequest);

    // Create token
    const token = jwt.sign({ entityId: entityId, email }, process.env.TOKEN_KEY, {
      expiresIn: "2h",
    });

    return {
      token: token,
      email: email,
      entityId: entityId,
    }
  }

  @Response<AppError>(400, "Validation Failed")
  @Response<NotFoundError>(404, "User not found")
  @Post("/login")
  async login(@Body() loginRequest: ILoginRequest): Promise<PlayersResponse | any> {
    const { email, password } = loginRequest;

    // Validate user input
    if (!(email && password)) {
      // raise ValidationError
      throw new AppError(400, 'Email or password not found!');
    }

    const player = await this.repository.findByEmail(email);

    if (!player) {
      // raise NotFoundError
      throw new NotFoundError('Player not found');
    }

    // Todo: ! Add encryption !
    if (player && password == player.password) {
      // Create token
      const token = jwt.sign({ entityId: player.entityId, email }, process.env.TOKEN_KEY, {
        expiresIn: "2h",
      });

      return {
        token: token,
        email: player.email,
        entityId: player.entityId,
      };
    }
  }

  @Security("jwt")
  @Get("/")
  async getAll(): Promise<PlayersResponse[]> {
    const players = await this.repository.findAll();
    const data = players.map(async player  => {
      return await this.convertPlayerModelToResponse(player);
    });

    return await Promise.all(data);
  }

  @Security("jwt")
  @Get("/{entityId}")
  async getByEntityId(@Path()  entityId: string): Promise<PlayersResponse> {
    return await this.convertPlayerModelToResponse(await this.repository.findByEntityID(entityId));
  }

  @Security("jwt")
  @Get("/city/{city}")
  async getPlayersByCity(@Path() city: string): Promise<PlayersResponse[]>  {
    const players = await this.repository.findPlayersByCity(city);
    const data = players.map(async player  => {
      return await this.convertPlayerModelToResponse(player);
    });

    return await Promise.all(data);
  }

  @Security("jwt")
  @Get("/level/{level}")
  async getPlayersByLevel(@Path() level: PlayerLevel): Promise<PlayersResponse[]> {
    const players = await this.repository.findPlayersByLevel(level);
    const data = players.map(async player => {
        return await this.convertPlayerModelToResponse(player);
    });

    return await Promise.all(data);
  }

  @Security("jwt")
  @Delete("/{entityId}")
  async deletePlayer(@Path() entityId: string): Promise<string> {
    return await this.repository.deleteEntity(entityId);
  }

  @Security("jwt")
  @Patch("/{entityId}")
  async updatePlayer(@Body() updateRequest: UpdatePlayerRequest, @Path()  entityId: string): Promise<string> {
    return await this.repository.updatePlayer(entityId, updateRequest);
  }

  private async convertPlayerModelToResponse(player: Player): Promise<PlayersResponse>{
    return {
      entityId: player.entityId,
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: player.nickname,
      level: player.level,
      email: player.email,
      city: player.city,
      address: player.address,
      country: player.country,
    } as PlayersResponse;
  }
}
