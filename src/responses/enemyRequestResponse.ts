

export default interface EnemyRequestResponse {
    bookingEntityID: string;
    courtEntityId: string;
    date: Date;
    totalPrice: number;
    from: number;
    to: number;
    playerNickname: string;
    numberOfPlayersNeeded: number;
    acceptedPlayerNicnames: string[];
    active: boolean;
    courtName: string;
    courtSurface: string;
}