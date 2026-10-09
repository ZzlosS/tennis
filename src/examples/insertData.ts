// Sample data for a local or staging database, so the app has clubs, courts and rackets to show.
//
//   npx ts-node src/examples/insertData.ts
//
// Run it once on an empty database: it does not check for what is already there.
import { faker } from "@faker-js/faker";
import BookingType from "../enums/bookingType";
import CourtKind from "../enums/courtKind";
import CourtSurface from "../enums/courtSurface";
import PlayerLevel from "../enums/playerLevel";
import RacketLevels from "../enums/racketLevels";
import BookingRepository from "../repositories/bookingRepository";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import PlayerRepository from "../repositories/playerRepository";
import RacketRepository from "../repositories/racketRepository";
import { hashPassword } from "../services/passwordService";
import RedisClient from "../services/redisClient";

const clubs = [
  { name: "TK Banjica", city: "Belgrade", address: "Banjicka 1" },
  { name: "TK Dunav", city: "Novi Sad", address: "Keja 3" },
];

const rackets = [
  {
    brand: "Wilson",
    model: "Pro Staff 97",
    year: 2018,
    weight: 315,
    headSizeInch: 97,
    balance: 9,
    stringPattern: "16x19",
  },
  {
    brand: "Babolat",
    model: "Pure Drive",
    year: 2021,
    weight: 300,
    headSizeInch: 100,
    balance: 32,
    stringPattern: "16x19",
  },
  {
    brand: "Head",
    model: "Graphene 360 Extreme Pro",
    year: 2018,
    weight: 329,
    headSizeInch: 100,
    balance: 6,
    stringPattern: "16x19",
  },
];

export async function seed() {
  const clubRepository = new ClubRepository();
  const courtRepository = new CourtRepository();
  const playerRepository = new PlayerRepository();
  const racketRepository = new RacketRepository();
  const bookingRepository = new BookingRepository();

  for (const racket of rackets) {
    await racketRepository.createRacket({
      ...racket,
      level: RacketLevels.PROFESSIONAL,
      recommendedStrings: "",
    });
  }

  const courtIds: string[] = [];
  for (const club of clubs) {
    const clubId = await clubRepository.createClub({
      ...club,
      description: faker.lorem.sentence(),
      country: "Serbia",
      currency: "RSD",
    });
    const clubEntity = await clubRepository.findByIdOrThrow(clubId, "Club");
    for (const surface of Object.values(CourtSurface)) {
      courtIds.push(
        await courtRepository.createClubCourt(
          {
            name: `Court ${surface.toLowerCase()}`,
            surface,
            stands: false,
            roof: false,
            double: false,
            pricePerHourMinor: faker.helpers.arrayElement([150000, 180000, 240000]),
          },
          clubEntity
        )
      );
    }
  }

  await courtRepository.createStandaloneCourt(
    {
      name: "Kalemegdan public court",
      surface: CourtSurface.HARD,
      stands: false,
      roof: false,
      double: false,
      kind: CourtKind.PUBLIC,
      address: "Kalemegdan",
      city: "Belgrade",
      country: "Serbia",
    },
    "seed"
  );

  const password = await hashPassword("password123");
  const playerIds: string[] = [];
  for (let index = 0; index < 4; index++) {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    playerIds.push(
      await playerRepository.createPlayer(
        {
          firstName,
          lastName,
          email: `player${index + 1}@example.com`,
          password: "password123",
          nickname: `${firstName}${lastName}`.toLowerCase(),
          level: faker.helpers.arrayElement(Object.values(PlayerLevel)),
          address: faker.address.streetAddress(),
          city: "Belgrade",
          country: "Serbia",
        },
        password
      )
    );
  }

  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 1);
  day.setUTCHours(16, 0, 0, 0);
  const startsAt = day.toISOString();
  const endsAt = new Date(day.getTime() + 2 * 3_600_000).toISOString();
  await bookingRepository.createBooking(
    { courtId: courtIds[0], startsAt, endsAt, bookingType: BookingType.ONE_TIME },
    playerIds[0],
    300000,
    "RSD"
  );

  console.log(
    `Seeded ${clubs.length} clubs, ${courtIds.length + 1} courts, ${playerIds.length} players (password123).`
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
