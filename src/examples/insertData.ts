import ClubDto from "../dtos/clubDto";
import RacketDto from "../dtos/racketDto";
import PlayerLevel from "../enums/playerLevel";
import RacketLevels from "../enums/racketLevels";
import BookingRepository from "../repositories/bookingRepository";
import PlayerRepository from "../repositories/playerRepository";
import RacketRepository from "../repositories/racketRepository";
import { faker } from "@faker-js/faker";
import ClubRepository from "../repositories/clubRepository";
import CourtRepository from "../repositories/courtRepository";
import CourtDto from "../dtos/courtDto";
import CourtSurface from "../enums/courtSurface";
import PlayerDto from "../dtos/playerDto";

function capitalizeFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function insertCourt(): Promise<string> {
  const repo = new CourtRepository();
  const dto: CourtDto= {
    name: `Court - ${capitalizeFirstLetter(faker.color.human())} ${faker.animal.dog()}`,
    surface: faker.helpers.arrayElement(Object.values(CourtSurface)),
    stands: faker.datatype.boolean(),
    double: faker.datatype.boolean(),
    roof: faker.datatype.boolean(),
    pricePerHour: faker.datatype.number({"min":500, "max": 3000, "precision": 50})
  };
  console.log("CourtDto");
  console.table(dto);

  const entityId = await repo.createCourt(dto);
  return entityId;
}

export async function insertClub(): Promise<string> {
  const dto: ClubDto = {
    name: `TK ${faker.word.noun().toUpperCase()}`,
    description: faker.lorem.paragraph(),
    address: faker.address.streetName(),
    city: faker.address.cityName(),
    country: faker.address.county(),
  };

  console.log("ClubDTO:");
  console.table(dto);

  const repo = new ClubRepository();
  const entityId = await repo.createClub(dto);

  console.log("🚀 ~ insertClub ~ entityId:", entityId);

  return entityId;
}

export async function insertPlayer(): Promise<string> {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();

  const repo = new PlayerRepository();

  const dto: PlayerDto = {
    firstName: firstName,
    lastName: lastName,
    email: faker.internet.email(firstName, lastName).toLowerCase(),
    nickname: faker.internet.userName(firstName, lastName).toLowerCase(),
    level: faker.helpers.arrayElement(Object.values(PlayerLevel)),
    address: faker.address.streetAddress(),
    city: faker.address.cityName(),
    country: faker.address.country()
  };
  console.table(dto);

  const entityId = await repo.createPlayer(dto);
  return entityId;
}

export async function insertRacket(): Promise<string> {
  // const dto: RacketDto = {
  // };

  return "";
}
export async function insertMatch(): Promise<string> {
  return "";
}
export async function insertRequest(): Promise<string> {
  return "";
}
export async function insertBooking(): Promise<string> {
  return "";
  // const bookingRepo = new BookingRepository();
  // const dto = {
  // } as BookingDto;
  // const b = bookingRepo.createBooking();
}

async function assignUnassigned() {
  const clubRepo = new ClubRepository();
  const clubs = await clubRepo.findAllByField("0", "courts");
  clubs.forEach((club) => {
    console.log("🚀 ~ club:", club.entityId);
  });

  const courtRepository = new CourtRepository();
  const courts = await courtRepository.findUnassignedCourts();
  console.table(courts);

  // courts.forEach(async (court, index) => {
  for (let index = 0; index < courts.length; index++) {
    const court = courts[index];
    const clubEntityID = clubs[index % 2].entityId;
    const r = await courtRepository.assignToClub(court.entityId, clubEntityID);
    const r2 = await clubRepo.incrementClubCourtCount(clubEntityID);
    console.log("🚀 court.entityId:", court.entityId);
    console.log("🚀 clubs[courts.length % 2].entityId:", clubs[courts.length % 2].entityId);
    console.log("🚀 r:", r);
    console.log("🚀 r2:", r2);
    console.log("*".repeat(100));
  };

}


async () => {
  const playerRepository = new PlayerRepository();
  const racketRepository = new RacketRepository();
  const player = await playerRepository.findByEmail("test@test.com");

  const dto: RacketDto = {
    brand: "Head",
    model: "Graphene 360 Extreme Pro",
    year: 2018,
    weight: 329,
    level: RacketLevels.PROFESSIONAL,
    headSizeInch: 100,
    balance: 6,
    stringPattern: "16x19",
    recommendedStrings: "360 Spin Grommets",
  };
  console.log("🚀 ~ dto:", dto);

  const head360 = await racketRepository.createRacket(dto);
  console.log("head ", head360);

  const aero = await racketRepository.findByUUID("2293af3c-c139-4f65-a73e-375133e5ee5b");
  console.log("aero.entityId ", aero.entityId);

  const result1 = await playerRepository.assignRacketToPlayer(player, head360);
  console.log("🚀 ~ result1:", result1);

  const result2 = await playerRepository.assignRacketToPlayer(player, aero.entityId);
  console.log("🚀 ~ result2:", result2);

  const dto2: RacketDto = {
    brand: "Wilson",
    model: "Pro Staff",
    year: 2018,
    weight: 335,
    level: RacketLevels.PROFESSIONAL,
    headSizeInch: 97,
    balance: 9,
    stringPattern: "16x19",
    recommendedStrings: "Hybrid Signum Pro Hextreme",
  };
  await racketRepository.createRacket(dto2);

  const dto3: RacketDto = {
    brand: "Wilson",
    model: "K Blade",
    year: 2008,
    weight: 315,
    level: RacketLevels.PROFESSIONAL,
    headSizeInch: 98,
    balance: 335,
    stringPattern: "18x20",
    recommendedStrings: "Luxilon Alu Power",
  };
  const r = await racketRepository.createRacket(dto3);
  console.log(r);

  const aeroE = await racketRepository.createEntity();
  aeroE.brand = "Babolat";
  aeroE.model = "Pure Aero Lite";
  aeroE.year = 2022;
  aeroE.brand = "Babolat";
  aeroE.level = RacketLevels.PROFESSIONAL;
  aeroE.headSizeInch = 27;
  aeroE.weight = 285;
  aeroE.balance = 320;
  aeroE.stringPattern = "16/19";
  aeroE.recommendedStrings = "RPM Blast String";
  await racketRepository.save(aeroE);
  console.log("🚀 ~ aero.uuid:", aeroE.uuid);

  const drive = await racketRepository.createEntity();
  drive.brand = "Babolat";
  drive.model = "Pure Drive Lite";
  drive.year = 2020;
  drive.brand = "Babolat";
  drive.level = RacketLevels.PROFESSIONAL;
  drive.headSizeInch = 27;
  drive.balance = 320;
  drive.weight = 285;
  drive.stringPattern = "16/19";
  drive.recommendedStrings = "RPM Blast String";
  await racketRepository.save(drive);
  console.log("🚀 ~ drive.uuid:", drive.uuid);

  const playerG = await playerRepository.createEntity();
  console.log("EID:", player.entityId);
  playerG.firstName = "Gocy";
  playerG.lastName = "Stojadinovic";
  playerG.email = "test@test.com";
  playerG.nickname = "Goxy";
  playerG.level = PlayerLevel.NEWBIE;
  playerG.address = "Parikse Komune 61";
  playerG.city = "NBGD";
  playerG.city = "Serbia";
  playerG.rackets = ["01GTSQC7WBNXM8WH21CMRQGNKP", "01GTSQBR5HZYVHDA8VJEXKQ8D4"];
  playerRepository.save(playerG);

  const racketsData = await racketRepository.getUserRackets([
    "01GTSQC7WBNXM8WH21CMRQGNKP",
    "01GTSQBR5HZYVHDA8VJEXKQ8D4",
  ]);
  racketsData.forEach((e) => console.log(e.entityId));
};

// const client = await new Client().open("redis://@127.0.0.1:6379");
// console.log("🚀 ~ client.isOpen()", client.isOpen());
// const repository: Repository<Users> = client.fetchRepository(usersSchema);
// repository.createIndex();
// // let u = await repository.createAndSave({
// //   firstName: 'firstName',
// //   lastName: 'lastName',
// //   password: 'password',
// //   email: 'email',
// //   // city: 'city',
// //   // address: 'address',
// // });
// // console.log('Entered: ', u.entityId);

// const repositoryItems: Repository<Items> = client.fetchRepository(itemsSchema);
// repositoryItems.createIndex();
// const item = repositoryItems.createEntity();
// repositoryItems.save(item);
// console.log("🚀 ~ item.entityId", item.entityId);
