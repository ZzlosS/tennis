import { COURT_NO_CLUB } from "../consts";
import { Club } from "../entities/club";
import { Court } from "../entities/court";
import { Match } from "../entities/match";
import { Booking } from "../entities/booking";
import { PartnerRequest } from "../entities/partnerRequest";
import { Player } from "../entities/player";
import { Racket } from "../entities/racket";
import MatchStatus from "../enums/matchStatus";
import PlayerLevel from "../enums/playerLevel";
import RequestStatus from "../enums/requestStatus";
import { toMoney } from "../http/money";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import { parseSets } from "../repositories/matchRepository";
import PlayerRepository from "../repositories/playerRepository";
import BookingResponse from "../responses/bookingResponse";
import ClubResponse from "../responses/clubResponse";
import { ClubSummary, CourtSummary, PlayerSummary } from "../responses/common";
import CourtResponse from "../responses/courtResponse";
import MatchResponse from "../responses/matchResponse";
import PartnerRequestResponse from "../responses/partnerRequestResponse";
import MeResponse from "../responses/meResponse";
import PlayerResponse from "../responses/playerResponse";
import RacketResponse from "../responses/racketResponse";
import BookingStatus from "../enums/bookingStatus";
import { parseLocation } from "./geo";
import { DEFAULT_CANCEL_CUTOFF_HOURS, scheduleOf } from "./courtSchedule";
import { DEFAULT_TIME_ZONE } from "./time";
import { AuthUser } from "./tokenService";
import { isAdmin } from "./access";

function coordinatesOf(location: string | undefined) {
  const place = parseLocation(location);
  return { latitude: place?.latitude ?? null, longitude: place?.longitude ?? null };
}

// Turns stored records into API responses, looking up the players, clubs and courts they mention.
export default class Mapper {
  private players = new PlayerRepository();
  private clubs = new ClubRepository();
  private courts = new CourtRepository();

  async playerSummary(playerId: string): Promise<PlayerSummary> {
    const player = await this.players.findByEntityID(playerId);
    return { id: playerId, nickname: player.nickname ?? "", level: player.level ?? PlayerLevel.NEWBIE };
  }

  async clubOf(court: Court): Promise<Club | null> {
    if (!court.club || court.club === COURT_NO_CLUB) {
      return null;
    }
    const club = await this.clubs.findByEntityID(court.club);
    return club.uuid != null ? club : null;
  }

  clubSummary(club: Club | null): ClubSummary | null {
    return club ? { id: club.entityId, name: club.name, city: club.city } : null;
  }

  courtSummary(court: Court): CourtSummary {
    return {
      id: court.entityId,
      name: court.name,
      surface: court.surface,
      clubId: court.club && court.club !== COURT_NO_CLUB ? court.club : null,
    };
  }

  async court(court: Court): Promise<CourtResponse> {
    const club = await this.clubOf(court);
    const schedule = scheduleOf(court, club);
    return {
      id: court.entityId,
      name: court.name,
      surface: court.surface,
      stands: court.stands,
      roof: court.roof,
      double: court.double,
      kind: court.kind,
      club: this.clubSummary(club),
      ownerId: club ? null : court.ownerId || null,
      address: court.address ?? "",
      city: court.city ?? "",
      country: court.country ?? "",
      pricePerHour: toMoney(court.pricePerHourMinor, court.currency),
      active: schedule.active,
      timeZone: schedule.timeZone,
      openingHours: schedule.openingHours,
      ...coordinatesOf(club ? club.location : court.location),
    };
  }

  async club(club: Club): Promise<ClubResponse> {
    return {
      id: club.entityId,
      name: club.name,
      address: club.address,
      description: club.description ?? "",
      city: club.city,
      country: club.country,
      currency: club.currency,
      courtCount: await this.courts.countClubCourts(club.entityId),
      timeZone: club.timeZone || DEFAULT_TIME_ZONE,
      openingHours: scheduleOf({} as Court, club).openingHours,
      cancelCutoffHours: club.cancelCutoffHours ?? DEFAULT_CANCEL_CUTOFF_HOURS,
      seasonEndsOn: club.seasonEndsOn || null,
      ...coordinatesOf(club.location),
    };
  }

  // Passwords never leave the API, and an email is only shown to its owner and admins.
  player(player: Player, viewer: AuthUser): PlayerResponse {
    const canSeeEmail = isAdmin(viewer) || viewer.id === player.entityId;
    return {
      id: player.entityId,
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: player.nickname,
      level: player.level,
      ...(canSeeEmail ? { email: player.email } : {}),
      city: player.city,
      address: player.address,
      country: player.country,
    };
  }

  // The logged-in player's own view of themselves.
  me(player: Player): MeResponse {
    return {
      ...this.player(player, { id: player.entityId, role: player.role }),
      email: player.email,
      role: player.role,
    };
  }

  racket(racket: Racket): RacketResponse {
    return {
      id: racket.entityId,
      brand: racket.brand,
      model: racket.model,
      year: racket.year,
      weight: racket.weight,
      level: racket.level,
      headSizeInch: racket.headSizeInch,
      balance: racket.balance,
      stringPattern: racket.stringPattern,
      recommendedStrings: racket.recommendedStrings ?? "",
    };
  }

  async booking(booking: Booking): Promise<BookingResponse> {
    const court = await this.courts.findByEntityID(booking.court);
    return {
      id: booking.entityId,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      court: this.courtSummary(court),
      club: this.clubSummary(await this.clubOf(court)),
      player: await this.playerSummary(booking.player),
      totalPrice: toMoney(booking.totalPriceMinor, booking.currency),
      bookingType: booking.bookingType,
      status: booking.status ?? BookingStatus.CONFIRMED,
      seriesId: booking.seriesId || null,
      paidAt: booking.paidAt ? new Date(booking.paidAt).toISOString() : null,
    };
  }

  async match(match: Match): Promise<MatchResponse> {
    const court = await this.courts.findByEntityID(match.court);
    return {
      id: match.entityId,
      firstTeam: await Promise.all(match.firstTeam.map((id) => this.playerSummary(id))),
      secondTeam: await Promise.all(match.secondTeam.map((id) => this.playerSummary(id))),
      sets: parseSets(match),
      status: match.status ?? MatchStatus.CONFIRMED,
      createdBy: await this.playerSummary(match.createdBy),
      playedAt: match.playedAt.toISOString(),
      court: this.courtSummary(court),
      club: this.clubSummary(await this.clubOf(court)),
    };
  }

  async partnerRequest(request: PartnerRequest, booking: Booking): Promise<PartnerRequestResponse> {
    const court = await this.courts.findByEntityID(booking.court);
    return {
      id: request.entityId,
      booking: {
        id: booking.entityId,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        court: this.courtSummary(court),
        club: this.clubSummary(await this.clubOf(court)),
      },
      createdBy: await this.playerSummary(request.playerId),
      playersNeeded: request.playersNeeded,
      level: request.level && request.level !== "ANY" ? (request.level as PlayerLevel) : null,
      spotsLeft: Math.max(0, request.playersNeeded - (request.joinedBy ?? []).length),
      joined: await Promise.all((request.joinedBy ?? []).map((id) => this.playerSummary(id))),
      status: request.active ? RequestStatus.OPEN : RequestStatus.CLOSED,
    };
  }
}
