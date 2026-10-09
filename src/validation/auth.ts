import { z } from "zod";
import PlayerLevel from "../enums/playerLevel";
import { email, optionalText, text } from "./common";

export const registerBody = z.object({
  firstName: text(100),
  lastName: text(100),
  email,
  // bcrypt only reads the first 72 bytes, so longer passwords are refused instead of silently cut.
  password: z.string().min(8).max(72),
  nickname: z.string().trim().max(50).optional(),
  level: z.nativeEnum(PlayerLevel).default(PlayerLevel.NEWBIE),
  address: optionalText(),
  city: optionalText(100),
  country: optionalText(100),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const refreshBody = z.object({
  refreshToken: z.string().min(1).max(200),
});

export const updatePlayerBody = z.object({
  firstName: text(100).optional(),
  lastName: text(100).optional(),
  level: z.nativeEnum(PlayerLevel).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
});
