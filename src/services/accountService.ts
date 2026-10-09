import Role from "../enums/role";
import BookingRepository from "../repositories/bookingRepository";
import CourtRepository from "../repositories/courtRepository";
import PlayerRepository from "../repositories/playerRepository";
import BookingService from "./bookingService";
import { now } from "./clock";
import { forgetDevicesOf } from "./deviceService";
import { PlaceIndex } from "./geo";
import { revokeAllRefreshTokens } from "./tokenService";

// Everything that has to happen when a player's account goes away.
export default class AccountService {
  private players = new PlayerRepository();
  private bookings = new BookingRepository();
  private courts = new CourtRepository();
  private bookingService = new BookingService();

  // Bookings still to come are cancelled (their hours go back to the club), courts the player owns are closed,
  // every session ends, and the email can be used to sign up again.
  async deleteAccount(playerId: string): Promise<void> {
    const upcoming = await this.bookings.findBookings({ playerId, endsAfter: now() });
    for (const booking of upcoming) {
      await this.bookingService.cancel({ id: playerId, role: Role.PLAYER }, booking, false, { skipCutoff: true });
    }
    for (const court of await this.courts.findOwnedCourts(playerId)) {
      court.active = false;
      await this.courts.save(court);
      await PlaceIndex.remove("COURT", court.entityId);
    }
    await revokeAllRefreshTokens(playerId);
    await forgetDevicesOf(playerId);
    await this.players.deletePlayer(playerId);
  }
}
