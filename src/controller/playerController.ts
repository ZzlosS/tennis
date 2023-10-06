import PlayerRepository from "../repositories/playerRepository";
const jwt = require("jsonwebtoken");
import ILoginRequest from "../requests/loginRequest";
import { Route, Get, Post, Body, Path, Response, Tags, Delete, Patch } from "tsoa";
import IRegisterRequest from "../requests/registerRequest";
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
  async register(@Body() registerRequest: IRegisterRequest): Promise<any> {
    const { firstName, lastName, email, password, address, city } = registerRequest;

    // Validate user input
    if (!(email && password && firstName && lastName)) {
      return { message: "All input is required", data: {} };
    }

    const existingUser = await this.repository.findByEmail(email);
    if (existingUser) {
      return { message: "User already exist!", data: {} };
    }

    // Todo: ! Add encryption !
    const encryptedPassword = password; 
    const user = await this.repository.createAndSave({
      firstName: firstName,
      lastName: lastName,
      password: encryptedPassword,
      email: email,
      city: city,
      address: address,
    });

    // Create token
    const token = jwt.sign({ user_id: user.entityId, email }, process.env.TOKEN_KEY, {
      expiresIn: "2h",
    });

    return {
      token: token,
      email: user.email,
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
      return { message: "All input is required", data: {} };
    }

    const player = await this.repository.findByEmail(email);

    if (!player) {
      // raise NotFoundError
      throw new NotFoundError('Player not found');
    }

    // Todo: ! Add encryption !
    if (player && password == player.password) {
      // Create token
      const token = jwt.sign({ user_id: player.entityId, email }, process.env.TOKEN_KEY, {
        expiresIn: "2h",
      });

      return token;
    }
  }

  @Get("/")
  async getAll(): Promise<PlayersResponse[]> {
    const players = await this.repository.findAll();
    const data = players.map(async player  => {
      return await this.convertPlayerModelToResponse(player);
    });

    return await Promise.all(data);
  }

  @Get("/{entityId}")
  async getByEntityId(@Path()  entityId: string): Promise<PlayersResponse> {
    return await this.convertPlayerModelToResponse(await this.repository.findByEntityID(entityId));
  }

  @Get("/city/{city}")
  async getPlayersByCity(@Path() city: string): Promise<PlayersResponse[]>  {
    const players = await this.repository.findPlayersByCity(city);
    const data = players.map(async player  => {
      return await this.convertPlayerModelToResponse(player);
    });

    return await Promise.all(data);
  }

  @Get("/level/{level}")
  async getPlayersByLevel(@Path() level: PlayerLevel): Promise<PlayersResponse[]> {
    const players = await this.repository.findPlayersByLevel(level);
    const data = players.map(async player => {
        return await this.convertPlayerModelToResponse(player);
    });

    return await Promise.all(data);
  }

  @Delete("/{entityId}")
  async deletePlayer(@Path() entityId: string): Promise<string> {
    return await this.repository.deleteEntity(entityId);
  }

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
