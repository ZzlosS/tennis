import { Body, Example, Middlewares, Post, Response, Route, SuccessResponse, Tags } from "tsoa";
import { authExample } from "../http/examples";
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
import { issueSession } from "../services/sessionService";
import { consumeRefreshToken, revokeRefreshToken } from "../services/tokenService";

@Tags("Auth")
@Route("auth")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
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

    return await issueSession(await this.repository.findByIdOrThrow(playerId, "Player"));
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

    return await issueSession(player);
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

    return await issueSession(player);
  }

  @SuccessResponse(204, "Logged out")
  @Middlewares(validate({ body: refreshBody }))
  @Post("/logout")
  async logout(@Body() request: RefreshRequest): Promise<void> {
    await revokeRefreshToken(request.refreshToken ?? "");
  }
}

const invalidCredentials = () => new UnauthorizedError("Wrong email or password", ErrorCode.INVALID_CREDENTIALS);
