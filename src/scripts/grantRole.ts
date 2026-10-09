// Gives a player a role. This is the only way to create the first ADMIN, so nobody can promote themselves.
//
//   npm run grant-role -- --email me@example.com --role ADMIN
//   npm run grant-role -- --email boss@club.com --role CLUB_ADMIN --club <clubId>
//
// The player has to log in again for the new role to appear in their token.
import { config } from "../config";
import Role from "../enums/role";
import ClubRepository from "../repositories/clubRepository";
import PlayerRepository from "../repositories/playerRepository";
import RedisClient from "../services/redisClient";

export async function grantRole(email: string, role: Role, clubId?: string) {
  const players = new PlayerRepository();
  const player = await players.findByEmail(email);
  if (!player) {
    throw new Error(`No player with email ${email}`);
  }
  if (role === Role.CLUB_ADMIN && !clubId) {
    throw new Error("--club <clubId> is required for CLUB_ADMIN");
  }

  if (clubId) {
    // Fails if the club does not exist, before the role is changed.
    await new ClubRepository().addAdmin(clubId, player.entityId);
  }
  await players.setRole(player.entityId, role);
  return player.entityId;
}

function readArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

async function main() {
  const { email, role, club } = readArgs(process.argv.slice(2));
  if (!email || !Object.values(Role).includes(role as Role)) {
    throw new Error(`Usage: grant-role --email <email> --role ${Object.values(Role).join("|")} [--club <clubId>]`);
  }

  await RedisClient.connect(config.REDIS_URL);
  const playerId = await grantRole(email, role as Role, club);
  console.log(`${email} (${playerId}) is now ${role}${club ? ` of club ${club}` : ""}`);
  await RedisClient.disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
