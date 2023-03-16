import PlayerLevel from "../enums/playerLevel";
import {
  validate,
  validateOrReject,
  Contains,
  IsInt,
  Length,
  IsEmail,
  IsFQDN,
  IsDate,
  Min,
  Max,
  IsEnum,
  IsNotEmpty,
  IsString,
} from "class-validator";

export default class PlayerDto {
  @IsNotEmpty()
  firstName: string;
  @IsNotEmpty()
  lastName: string;
  @IsEmail()
  email: string;
  password: string;
  nickname: string;
  @IsEnum(PlayerLevel)
  level: PlayerLevel;
  address: string;
  city: string;
  country: string;

  constructor(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    nickname: string,
    level: PlayerLevel,
    address: string,
    city: string,
    country: string
  ) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
    this.nickname = nickname;
    this.level = level;
    this.address = address;
    this.city = city;
    this.country = country;
  }
}
