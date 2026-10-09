import { config } from "../config";
import { logger } from "../logger";

export interface PushMessage {
  // An Expo push token, "ExponentPushToken[...]".
  to: string;
  title: string;
  body: string;
  // What the app needs to open the right screen.
  data: Record<string, string>;
}

export interface PushResult {
  to: string;
  ok: boolean;
  // True when Expo says the token is no longer valid: the app was uninstalled or the token rotated.
  deviceGone: boolean;
}

export interface PushClient {
  send(messages: PushMessage[]): Promise<PushResult[]>;
}

export const isExpoToken = (token: string) => /^(Expo|Exponent)PushToken\[.+\]$/.test(token);

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
// Expo takes at most 100 messages in one request.
const BATCH = 100;

export class ExpoPushClient implements PushClient {
  constructor(private accessToken?: string) {}

  async send(messages: PushMessage[]): Promise<PushResult[]> {
    const results: PushResult[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const response = await fetch(EXPO_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        },
        body: JSON.stringify(batch.map((message) => ({ ...message, sound: "default" }))),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`Expo answered ${response.status}: ${await response.text()}`);
      }
      const { data } = (await response.json()) as {
        data: { status: string; details?: { error?: string } }[];
      };
      batch.forEach((message, index) => {
        const ticket = data[index];
        results.push({
          to: message.to,
          ok: ticket?.status === "ok",
          deviceGone: ticket?.details?.error === "DeviceNotRegistered",
        });
      });
    }
    return results;
  }
}

// Keeps what it was asked to send, for tests. `gone` lists tokens it should report as no longer valid.
export class FakePushClient implements PushClient {
  sent: PushMessage[] = [];
  gone = new Set<string>();

  async send(messages: PushMessage[]): Promise<PushResult[]> {
    this.sent.push(...messages);
    return messages.map((message) => ({
      to: message.to,
      ok: !this.gone.has(message.to),
      deviceGone: this.gone.has(message.to),
    }));
  }
}

let current: PushClient | undefined;

export function getPushClient(): PushClient {
  current ??= new ExpoPushClient(config.EXPO_ACCESS_TOKEN);
  return current;
}

// Swaps the client; null goes back to Expo.
export function setPushClient(client: PushClient | null) {
  current = client ?? undefined;
}

export function logPushFailure(error: unknown) {
  logger.error({ err: error }, "could not send push notifications");
}
