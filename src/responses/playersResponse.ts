import PlayerLevel from "../enums/playerLevel";

export default interface IPlayersResponse {
    firstName: string;
    lastName: string;
    nickname: string;
    level: PlayerLevel;
    address: string;
    city: string;
    country: string;
}
