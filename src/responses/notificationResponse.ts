import { NotificationType } from "../services/pushTemplates";

export default interface NotificationResponse {
  id: string;
  // What happened; the app opens the matching screen from it and `data`.
  type: NotificationType;
  // Written in the player's language when it was sent.
  title: string;
  body: string;
  // Ids of what it is about: bookingId, requestId, matchId or handoverId.
  data: { [key: string]: string };
  createdAt: string;
  // Sent before the player last marked the list as read.
  read: boolean;
}

export interface UnreadCountResponse {
  count: number;
}
