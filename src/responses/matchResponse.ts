
export default interface MatchResponse {
    entityId: string;
    firstTeam: string[];
    secondTeam: string[];
    result: string[];
    date: Date;
    clubName: string;
    courtName: string;
    courtSurface: string;
}