import { config } from "../config";
import { logger } from "../logger";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

// Sends through Resend (https://resend.com/docs/api-reference/emails/send-email).
export class ResendMailer implements Mailer {
  constructor(
    private apiKey: string,
    private from: string
  ) {}

  async send(mail: Mail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!response.ok) {
      throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
    }
  }
}

// For development without an account: the email is written to the log, links included.
export class LogMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    logger.info({ to: mail.to, subject: mail.subject, text: mail.text }, "email (not sent: no RESEND_API_KEY)");
  }
}

// Keeps what it was asked to send, for tests.
export class FakeMailer implements Mailer {
  sent: Mail[] = [];
  async send(mail: Mail): Promise<void> {
    this.sent.push(mail);
  }
}

let current: Mailer | undefined;

export function getMailer(): Mailer {
  current ??= config.RESEND_API_KEY ? new ResendMailer(config.RESEND_API_KEY, config.MAIL_FROM) : new LogMailer();
  return current;
}

// Swaps the mailer; null goes back to the one the configuration asks for.
export function setMailer(mailer: Mailer | null) {
  current = mailer ?? undefined;
}

// Sending an email must never break the request that asked for it (the player can ask again), so failures are logged.
export async function sendMailSafely(mail: Mail): Promise<void> {
  try {
    await getMailer().send(mail);
  } catch (error) {
    logger.error({ err: error, to: mail.to }, "could not send email");
  }
}
