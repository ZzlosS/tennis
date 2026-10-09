import PlayerRepository from "../repositories/playerRepository";
import { now } from "./clock";
import { devicesOf, unregisterDevice } from "./deviceService";
import { addToInbox } from "./inboxService";
import { getPushClient, logPushFailure, PushMessage } from "./pushClient";
import { Language, NotificationType, Params, render } from "./pushTemplates";

// Sends a push notification to every phone of some players, in each player's own language, and keeps a copy in each
// player's inbox (also for players with no phone registered). A notification is never worth failing a request over,
// so errors are logged and swallowed.
export default class Notifier {
  private players = new PlayerRepository();

  async notify(
    playerIds: string[],
    type: NotificationType,
    params: Params,
    data: Record<string, string> = {}
  ): Promise<void> {
    try {
      const messages: (PushMessage & { playerId: string })[] = [];
      for (const playerId of new Set(playerIds)) {
        const player = await this.players.findByEntityID(playerId);
        if (player.uuid == null || player.deleted) continue;
        const language: Language = player.language === "sr" ? "sr" : "en";
        const { title, body } = render(type, language, params);
        await addToInbox(playerId, { type, title, body, data, createdAt: now().getTime() });
        for (const token of await devicesOf(playerId)) {
          messages.push({ to: token, title, body, data: { type, ...data }, playerId });
        }
      }
      if (messages.length === 0) return;

      const results = await getPushClient().send(messages.map(({ playerId: _playerId, ...message }) => message));
      // A phone that no longer exists is forgotten, so it is not tried again.
      for (const result of results.filter((r) => r.deviceGone)) {
        const owner = messages.find((message) => message.to === result.to)?.playerId;
        if (owner) await unregisterDevice(owner, result.to);
      }
    } catch (error) {
      logPushFailure(error);
    }
  }
}
