// Sample data for a local or staging database, so the app has clubs, courts, bookings, matches and rackets to show.
//
//   npm run seed
//
// It does nothing if the database already has clubs. Every player below has the password `password123`:
//   admin@example.com       ADMIN
//   clubadmin@example.com   CLUB_ADMIN of TK Banjica
//   player1@example.com ... player6@example.com
import BookingType from "../enums/bookingType";
import CourtKind from "../enums/courtKind";
import CourtSurface from "../enums/courtSurface";
import MatchStatus from "../enums/matchStatus";
import PlayerLevel from "../enums/playerLevel";
import RacketLevels from "../enums/racketLevels";
import Role from "../enums/role";
import ClubRepository from "../repositories/clubRepository";
import CourtHandoverRepository from "../repositories/courtHandoverRepository";
import CourtRepository from "../repositories/courtRepository";
import MatchRepository from "../repositories/matchRepository";
import PlayerRepository from "../repositories/playerRepository";
import RacketRepository from "../repositories/racketRepository";
import { grantRole } from "../scripts/grantRole";
import BlockService from "../services/blockService";
import BookingService from "../services/bookingService";
import { now } from "../services/clock";
import { hashPassword } from "../services/passwordService";
import RedisClient from "../services/redisClient";
import StatsService from "../services/statsService";
import { DAY_MS, HOUR_MS } from "../services/time";

const PASSWORD = "password123";

const clubs = [
  {
    name: "TK Banjica",
    city: "Belgrade",
    address: "Banjicka 1",
    latitude: 44.7616,
    longitude: 20.4647,
    description: "Three courts and a clubhouse in Banjica.",
    timeZone: "Europe/Belgrade",
    surfaces: [CourtSurface.CLAY, CourtSurface.CLAY, CourtSurface.HARD],
    pricePerHourMinor: 180000,
  },
  {
    name: "TK Dunav",
    city: "Novi Sad",
    address: "Kej 3",
    latitude: 45.2551,
    longitude: 19.8451,
    description: "Clay courts by the river.",
    timeZone: "Europe/Belgrade",
    surfaces: [CourtSurface.CLAY, CourtSurface.GRASS],
    pricePerHourMinor: 150000,
  },
];

const rackets = [
  { brand: "Wilson", model: "Pro Staff 97", year: 2018, weight: 315, headSizeInch: 97, balance: 9 },
  { brand: "Babolat", model: "Pure Drive", year: 2021, weight: 300, headSizeInch: 100, balance: 32 },
  { brand: "Head", model: "Graphene 360 Extreme Pro", year: 2018, weight: 329, headSizeInch: 100, balance: 6 },
];

const people = [
  ["Marko", "Petrovic", PlayerLevel.INTERMEDIATE],
  ["Ana", "Jovanovic", PlayerLevel.ADVANCED],
  ["Nikola", "Ilic", PlayerLevel.BEGINNER],
  ["Jelena", "Markovic", PlayerLevel.INTERMEDIATE],
  ["Stefan", "Djordjevic", PlayerLevel.PRO],
  ["Milica", "Stankovic", PlayerLevel.NEWBIE],
] as const;

// Midday UTC, `days` from now: 13:00 or 14:00 in Belgrade, inside every court's opening hours.
const dayAt = (days: number, utcHour: number) => {
  const start = new Date(Math.floor(now().getTime() / DAY_MS) * DAY_MS + days * DAY_MS + utcHour * HOUR_MS);
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR_MS).toISOString() };
};

export async function seed() {
  const clubRepository = new ClubRepository();
  const courtRepository = new CourtRepository();
  const playerRepository = new PlayerRepository();
  const racketRepository = new RacketRepository();
  const matchRepository = new MatchRepository();
  const bookingService = new BookingService();

  if ((await clubRepository.findAll()).length > 0) {
    console.log("The database already has clubs, so nothing was added.");
    return;
  }

  for (const racket of rackets) {
    await racketRepository.createRacket({
      ...racket,
      level: RacketLevels.PROFESSIONAL,
      stringPattern: "16x19",
      recommendedStrings: "",
    });
  }

  // Players: an ADMIN, a club admin, and six players.
  const hash = await hashPassword(PASSWORD);
  const newPlayer = async (firstName: string, lastName: string, email: string, level: PlayerLevel) => {
    await playerRepository.claimEmail(email);
    const id = await playerRepository.createPlayer(
      {
        firstName,
        lastName,
        email,
        password: PASSWORD,
        nickname: firstName.toLowerCase(),
        level,
        address: "Knez Mihailova 5",
        city: "Belgrade",
        country: "Serbia",
      },
      hash
    );
    await playerRepository.setEmailOwner(email, id);
    return id;
  };
  await newPlayer("Ada", "Admin", "admin@example.com", PlayerLevel.ADVANCED);
  const clubAdminId = await newPlayer("Cara", "Clubadmin", "clubadmin@example.com", PlayerLevel.INTERMEDIATE);
  const playerIds: string[] = [];
  for (const [index, [firstName, lastName, level]] of people.entries()) {
    playerIds.push(await newPlayer(firstName, lastName, `player${index + 1}@example.com`, level));
  }
  await grantRole("admin@example.com", Role.ADMIN);

  // Clubs with their courts.
  const courtIds: string[] = [];
  const clubIds: string[] = [];
  for (const { surfaces, pricePerHourMinor, ...details } of clubs) {
    const clubId = await clubRepository.createClub({ ...details, country: "Serbia", currency: "RSD" });
    clubIds.push(clubId);
    const club = await clubRepository.findByIdOrThrow(clubId, "Club");
    for (const [index, surface] of surfaces.entries()) {
      courtIds.push(
        await courtRepository.createClubCourt(
          {
            name: `Court ${index + 1}`,
            surface,
            stands: index === 0,
            roof: false,
            double: false,
            pricePerHourMinor,
          },
          club
        )
      );
    }
  }
  await grantRole("clubadmin@example.com", Role.CLUB_ADMIN, clubIds[0]);

  // Courts without a club: a free public court and a private one.
  await courtRepository.createStandaloneCourt(
    {
      name: "Kalemegdan park court",
      surface: CourtSurface.HARD,
      stands: false,
      roof: false,
      double: false,
      kind: CourtKind.PUBLIC,
      address: "Kalemegdan",
      city: "Belgrade",
      country: "Serbia",
      latitude: 44.8231,
      longitude: 20.4505,
    },
    playerIds[0]
  );
  const privateCourtId = await courtRepository.createStandaloneCourt(
    {
      name: "Ada private court",
      surface: CourtSurface.CLAY,
      stands: false,
      roof: false,
      double: false,
      kind: CourtKind.PRIVATE,
      address: "Ada Ciganlija",
      city: "Belgrade",
      country: "Serbia",
      latitude: 44.7866,
      longitude: 20.4189,
      pricePerHourMinor: 100000,
    },
    playerIds[1]
  );
  // The owner of the private court has asked TK Banjica to take it over; the club has not answered yet.
  await new CourtHandoverRepository().createHandover(privateCourtId, clubIds[0], playerIds[1]);

  // Bookings: one with a partner request, one weekly month, and a day the club keeps for itself.
  await bookingService.create(playerIds[0], {
    courtId: courtIds[0],
    ...dayAt(2, 14),
    bookingType: BookingType.ONE_TIME,
    partnerRequest: { playersNeeded: 1, level: PlayerLevel.INTERMEDIATE },
  });
  await bookingService.create(playerIds[1], {
    courtId: courtIds[1],
    ...dayAt(3, 15),
    bookingType: BookingType.MONTH,
    partnerRequest: { playersNeeded: 3 },
  });
  await bookingService.create(playerIds[2], {
    courtId: courtIds[3],
    ...dayAt(4, 12),
    bookingType: BookingType.ONE_TIME,
  });
  await new BlockService().create(await courtRepository.findByIdOrThrow(courtIds[2], "Court"), clubAdminId, {
    ...dayAt(5, 8),
    endsAt: dayAt(5, 16).endsAt,
    reason: "Club tournament",
  });

  // Matches: some confirmed (and counted in the stats), one waiting for the other team.
  const stats = new StatsService();
  const sets = (...scores: [number, number][]) => scores.map(([firstTeam, secondTeam]) => ({ firstTeam, secondTeam }));
  const matches: [number, number, [number, number][], MatchStatus][] = [
    [
      0,
      1,
      [
        [6, 4],
        [3, 6],
        [7, 5],
      ],
      MatchStatus.CONFIRMED,
    ],
    [
      0,
      3,
      [
        [6, 2],
        [6, 3],
      ],
      MatchStatus.CONFIRMED,
    ],
    [
      1,
      4,
      [
        [4, 6],
        [6, 7],
      ],
      MatchStatus.CONFIRMED,
    ],
    [
      2,
      5,
      [
        [6, 0],
        [6, 1],
      ],
      MatchStatus.PENDING,
    ],
  ];
  for (const [first, second, score, status] of matches) {
    const id = await matchRepository.createMatch(
      {
        firstTeam: [playerIds[first]],
        secondTeam: [playerIds[second]],
        sets: sets(...score),
        courtId: courtIds[0],
        playedAt: new Date(now().getTime() - 7 * DAY_MS).toISOString(),
      },
      playerIds[first],
      status
    );
    if (status === MatchStatus.CONFIRMED) {
      await stats.apply(await matchRepository.findByIdOrThrow(id, "Match"), 1);
    }
  }

  console.log(
    `Seeded ${clubs.length} clubs, ${courtIds.length + 2} courts, ${playerIds.length + 2} players, ${rackets.length} rackets. ` +
      `Log in as admin@example.com, clubadmin@example.com or player1@example.com (password ${PASSWORD}).`
  );
}

if (require.main === module) {
  seed()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => RedisClient.disconnect());
}
