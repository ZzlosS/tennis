import { Search } from "redis-om";
import { COURT_NO_CLUB } from "../consts";
import { Club } from "../entities/club";
import { Court } from "../entities/court";
import CourtKind from "../enums/courtKind";
import CourtSurface from "../enums/courtSurface";
import { DEFAULT_CURRENCY } from "../http/money";
import { PageQuery } from "../http/pagination";
import CourtCreateRequest from "../requests/courtCreateRequest";
import StandaloneCourtCreateRequest from "../requests/standaloneCourtCreateRequest";
import UpdateCourtRequest from "../requests/updateCourtRequest";
import { courtSchema } from "../schemas/courtSchema";
import BaseRepository from "./baseRepository";

export interface CourtFilters {
  // A club id, or COURT_NO_CLUB for courts that have none.
  club?: string;
  kind?: CourtKind;
  city?: string;
  surface?: CourtSurface;
  minPrice?: number;
  maxPrice?: number;
}

export default class CourtRepository extends BaseRepository<Court> {
  constructor() {
    super(courtSchema);
  }

  private fill(court: Court, request: CourtCreateRequest) {
    court.name = request.name;
    court.surface = request.surface;
    court.stands = request.stands;
    court.roof = request.roof;
    court.double = request.double;
    court.pricePerHourMinor = request.pricePerHourMinor ?? 0;
  }

  // A club court copies the club's place, so courts can be searched by city without looking up their club.
  async createClubCourt(request: CourtCreateRequest, club: Club) {
    const court = await this.createEntity();
    this.fill(court, request);
    court.kind = CourtKind.CLUB;
    court.club = club.entityId;
    court.ownerId = "";
    court.address = club.address;
    court.city = club.city;
    court.country = club.country;
    court.currency = club.currency;
    return await this.save(court);
  }

  async createStandaloneCourt(request: StandaloneCourtCreateRequest, ownerId: string) {
    const court = await this.createEntity();
    this.fill(court, request);
    court.kind = request.kind as CourtKind;
    court.club = COURT_NO_CLUB;
    court.ownerId = ownerId;
    court.address = request.address;
    court.city = request.city;
    court.country = request.country;
    court.currency = request.currency ?? DEFAULT_CURRENCY;
    return await this.save(court);
  }

  private matching(filters: CourtFilters) {
    return (search: Search<Court>) => {
      if (filters.club) {
        search = search.where("club").equals(filters.club);
      }
      if (filters.kind) {
        search = search.where("kind").equals(filters.kind);
      }
      if (filters.city) {
        search = search.where("city").equals(filters.city);
      }
      if (filters.surface) {
        search = search.where("surface").equals(filters.surface);
      }
      if (filters.minPrice !== undefined) {
        search = search.where("pricePerHourMinor").greaterThanOrEqualTo(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        search = search.where("pricePerHourMinor").lessThanOrEqualTo(filters.maxPrice);
      }
      return search;
    };
  }

  async findCourtsPage(filters: CourtFilters, query: PageQuery) {
    return await this.findPage(this.matching(filters), query);
  }

  async findClubCourts(clubId: string) {
    return await this.findAllMatching(this.matching({ club: clubId }));
  }

  async countClubCourts(clubId: string) {
    return await this.count(this.matching({ club: clubId }));
  }

  // The court becomes a club court and the club's admins manage it from then on.
  async assignToClub(courtId: string, club: Club) {
    const court = await this.findByIdOrThrow(courtId, "Court");
    court.kind = CourtKind.CLUB;
    court.club = club.entityId;
    court.ownerId = "";
    court.address = club.address;
    court.city = club.city;
    court.country = club.country;
    court.currency = club.currency;
    return await this.save(court);
  }

  // Keeps the copied place and currency of a club's courts in step when the club changes them.
  async syncClubDetails(club: Club) {
    for (const court of await this.findClubCourts(club.entityId)) {
      court.address = club.address;
      court.city = club.city;
      court.country = club.country;
      court.currency = club.currency;
      await this.save(court);
    }
  }

  async updateCourt(entityId: string, updateRequest: UpdateCourtRequest) {
    const court = await this.findByIdOrThrow(entityId, "Court");

    if (updateRequest.name) {
      court.name = updateRequest.name;
    }
    if (updateRequest.surface) {
      court.surface = updateRequest.surface;
    }
    if (updateRequest.stands !== undefined) {
      court.stands = updateRequest.stands;
    }
    if (updateRequest.roof !== undefined) {
      court.roof = updateRequest.roof;
    }
    if (updateRequest.double !== undefined) {
      court.double = updateRequest.double;
    }
    if (updateRequest.pricePerHourMinor !== undefined) {
      court.pricePerHourMinor = updateRequest.pricePerHourMinor;
    }
    if (updateRequest.address) {
      court.address = updateRequest.address;
    }
    if (updateRequest.city) {
      court.city = updateRequest.city;
    }
    if (updateRequest.country) {
      court.country = updateRequest.country;
    }
    if (updateRequest.currency) {
      court.currency = updateRequest.currency;
    }

    return await this.save(court);
  }
}
