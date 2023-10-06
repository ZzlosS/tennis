export default interface UpdateMatchRequest {
    firstTeam: string[];
    secondTeam: string[];
    result: string[];
    court: string;
    date: Date;
}