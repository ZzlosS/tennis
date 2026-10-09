import { Body, Example, Middlewares, Post, Response, Route, SuccessResponse, Tags } from "tsoa";
import { authExample } from "../http/examples";
import { Player } from "../entities/player";
import Role from "../enums/role";
import { ConflictError, UnauthorizedError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import { validate } from "../middleware/validate";
import { ErrorBody } from "../responses/common";
import { loginBody, refreshBody, registerBody } from "../validation/auth";
import PlayerRepository from "../repositories/playerRepository";
import LoginRequest from "../requests/loginRequest";
import RefreshRequest from "../requests/refreshRequest";
import RegisterRequest from "../requests/registerRequest";
import AuthResponse from "../responses/authResponse";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../services/passwordService";
import { consumeRefreshToken, issueRefreshToken, revokeRefreshToken, signAccessToken } from "../services/tokenService";

@Tags("Auth")
@Route("auth")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
export class AuthController {
  repository: PlayerRepository;

  constructor() {
    this.repository = new PlayerRepository();
  }

  @Example(authExample)
  @SuccessResponse(201, "Created")
  @Response<ErrorBody>(409, "EMAIL_TAKEN")
  @Middlewares(validate({ body: registerBody }))
  @Post("/register")
  async register(@Body() request: RegisterRequest): Promise<AuthResponse> {
    if (!(await this.repository.claimEmail(request.email))) {
      throw new ConflictError("Email is already registered", ErrorCode.EMAIL_TAKEN);
    }

    let playerId: string;
    try {
      const passwordHash = await hashPassword(request.password);
      playerId = await this.repository.createPlayer(request, passwordHash);
      await this.repository.setEmailOwner(request.email, playerId);
    } catch (error) {
      await this.repository.releaseEmail(request.email);
      throw error;
    }

    return await this.issueSession(await this.repository.findByIdOrThrow(playerId, "Player"));
  }

  // Unknown email, wrong password and deleted account all give the same answer.
  @Example(authExample)
  @Response<ErrorBody>(401, "INVALID_CREDENTIALS")
  @Middlewares(validate({ body: loginBody }))
  @Post("/login")
  async login(@Body() request: LoginRequest): Promise<AuthResponse> {
    const player = await this.repository.findByEmail(request.email);

    if (!player) {
      await burnPasswordCheck(request.password);
      throw invalidCredentials();
    }
    if (!(await verifyPassword(request.password, player.password))) {
      throw invalidCredentials();
    }

    return await this.issueSession(player);
  }

  // Each refresh token works once: using it returns a new pair.
  @Example(authExample)
  @Response<ErrorBody>(401, "UNAUTHENTICATED")
  @Middlewares(validate({ body: refreshBody }))
  @Post("/refresh")
  async refresh(@Body() request: RefreshRequest): Promise<AuthResponse> {
    const playerId = await consumeRefreshToken(request.refreshToken ?? "");
    if (!playerId) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const player = await this.repository.findByEntityID(playerId);
    if (player.uuid == null || player.deleted) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    return await this.issueSession(player);
  }

  @SuccessResponse(204, "Logged out")
  @Middlewares(validate({ body: refreshBody }))
  @Post("/logout")
  async logout(@Body() request: RefreshRequest): Promise<void> {
    await revokeRefreshToken(request.refreshToken ?? "");
  }

  private async issueSession(player: Player): Promise<AuthResponse> {
    const role = player.role ?? Role.PLAYER;
    const { token, expiresIn } = signAccessToken({ id: player.entityId, role });

    return {
      accessToken: token,
      expiresIn,
      refreshToken: await issueRefreshToken(player.entityId),
      player: {
        id: player.entityId,
        firstName: player.firstName,
        lastName: player.lastName,
        nickname: player.nickname,
        email: player.email,
        level: player.level,
        role,
        address: player.address,
        city: player.city,
        country: player.country,
      },
    };
  }
}

const invalidCredentials = () => new UnauthorizedError("Wrong email or password", ErrorCode.INVALID_CREDENTIALS);
