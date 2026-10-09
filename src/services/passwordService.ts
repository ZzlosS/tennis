import bcrypt from "bcrypt";
import { config } from "../config";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

// Compared against when the email is unknown, so a miss takes as long as a hit.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("not-a-real-password");
  await bcrypt.compare(password, await dummyHash);
}
