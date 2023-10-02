import PlayerLevel from "../enums/playerLevel";

export default interface IRegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    nickname: string;
    level: PlayerLevel;
    address: string;
    city: string;
    country: string;
}
