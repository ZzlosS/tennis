import { Body, Example, Middlewares, Post, Response, Route, SuccessResponse, Tags } from "tsoa";
import { authExample } from "../http/examples";
import AppError, { ConflictError, UnauthorizedError } from "../errors/appError";
import { ErrorCode } from "../errors/codes";
import { validate } from "../middleware/validate";
import { ErrorBody } from "../responses/common";
import {
  forgotPasswordBody,
  loginBody,
  refreshBody,
  registerBody,
  resetPasswordBody,
  tokenBody,
} from "../validation/auth";
import ForgotPasswordRequest from "../requests/forgotPasswordRequest";
import ResetPasswordRequest from "../requests/resetPasswordRequest";
import TokenRequest from "../requests/tokenRequest";
import EmailAccountService from "../services/emailAccountService";
import { now } from "../services/clock";
import { consumeToken } from "../services/oneTimeToken";
import PlayerRepository from "../repositories/playerRepository";
import LoginRequest from "../requests/loginRequest";
import RefreshRequest from "../requests/refreshRequest";
import RegisterRequest from "../requests/registerRequest";
import AuthResponse from "../responses/authResponse";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../services/passwordService";
import { issueSession } from "../services/sessionService";
import { consumeRefreshToken, revokeAllRefreshTokens, revokeRefreshToken } from "../services/tokenService";

@Tags("Auth")
@Route("auth")
@Response<ErrorBody>(400, "VALIDATION_FAILED")
@Response<ErrorBody>(429, "RATE_LIMITED")
export class AuthController {
  repository: PlayerRepository;
  private emails = new EmailAccountService();

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

    const player = await this.repository.findByIdOrThrow(playerId, "Player");
    await this.emails.sendVerification(player, request.language ?? "en");
    return await issueSession(player);
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

  /**
   * Emails a link to choose a new password, which works once for an hour. The answer is always 204, whether or not
   * the email belongs to a player, so the route cannot be used to find out who has an account. Asking again within
   * a minute sends nothing new.
   */
  @SuccessResponse(204, "Done")
  @Middlewares(validate({ body: forgotPasswordBody }))
  @Post("/forgot-password")
  async forgotPassword(@Body() request: ForgotPasswordRequest): Promise<void> {
    const player = await this.repository.findByEmail(request.email);
    if (player) {
      await this.emails.sendPasswordReset(player, request.language ?? (player.language === "sr" ? "sr" : "en"));
    }
  }

  /** Sets the new password with the token from the email. Every session of the player ends; they log in again. */
  @SuccessResponse(204, "Password changed")
  @Response<ErrorBody>(400, "TOKEN_INVALID")
  @Middlewares(validate({ body: resetPasswordBody }))
  @Post("/reset-password")
  async resetPassword(@Body() request: ResetPasswordRequest): Promise<void> {
    const playerId = await consumeToken("reset", request.token);
    const player = playerId ? await this.repository.findByEntityID(playerId) : undefined;
    if (!playerId || !player || player.uuid == null || player.deleted) {
      throw new AppError(400, ErrorCode.TOKEN_INVALID, "This link has expired or was already used");
    }
    await this.repository.setPassword(playerId, await hashPassword(request.newPassword));
    // The link went to the player's inbox, which also proves the address is theirs.
    await this.repository.markEmailVerified(playerId, player.emailVerifiedAt || now().getTime());
    await revokeAllRefreshTokens(playerId);
  }

  /** Confirms the email address with the token from the email. */
  @SuccessResponse(204, "Email confirmed")
  @Response<ErrorBody>(400, "TOKEN_INVALID")
  @Middlewares(validate({ body: tokenBody }))
  @Post("/verify-email")
  async verifyEmail(@Body() request: TokenRequest): Promise<void> {
    const issuedFor = await consumeToken("verify", request.token);
    const [playerId, email] = issuedFor ? issuedFor.split("|") : [];
    const player = playerId ? await this.repository.findByEntityID(playerId) : undefined;
    if (!player || player.uuid == null || player.deleted || player.email !== email) {
      throw new AppError(400, ErrorCode.TOKEN_INVALID, "This link has expired or was already used");
    }
    await this.repository.markEmailVerified(playerId, player.emailVerifiedAt || now().getTime());
  }

  @SuccessResponse(204, "Logged out")
  @Middlewares(validate({ body: refreshBody }))
  @Post("/logout")
  async logout(@Body() request: RefreshRequest): Promise<void> {
    await revokeRefreshToken(request.refreshToken ?? "");
  }
}

const invalidCredentials = () => new UnauthorizedError("Wrong email or password", ErrorCode.INVALID_CREDENTIALS);
