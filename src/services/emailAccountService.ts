import { Player } from "../entities/player";
import { TooManyRequestsError } from "../errors/appError";
import { passwordResetMail, verifyEmailMail, Language } from "./emailTemplates";
import { sendMailSafely } from "./mailer";
import { allowOnce, issueToken } from "./oneTimeToken";

const RESET_TTL_SECONDS = 60 * 60;
const VERIFY_TTL_SECONDS = 24 * 60 * 60;
// A player can ask for the same email once a minute, so the form cannot be used to fill someone's inbox.
const COOLDOWN_SECONDS = 60;

// Emails that carry a one-time link.
export default class EmailAccountService {
  // Sends nothing (and says nothing) when the player asked a moment ago.
  async sendPasswordReset(player: Player, language: Language): Promise<void> {
    if (!(await allowOnce("reset", player.entityId, COOLDOWN_SECONDS))) {
      return;
    }
    const token = await issueToken("reset", player.entityId, RESET_TTL_SECONDS);
    await sendMailSafely(passwordResetMail(player.email, player.firstName, token, language));
  }

  // The link only works while the player still has this email address. With `strict` a repeat request within the
  // minute is answered with 429 (the "send it again" button); otherwise it is skipped quietly.
  async sendVerification(player: Player, language: Language, strict = false): Promise<void> {
    if (!(await allowOnce("verify", player.entityId, COOLDOWN_SECONDS))) {
      if (strict) {
        throw new TooManyRequestsError("A confirmation email was just sent, try again in a minute", COOLDOWN_SECONDS);
      }
      return;
    }
    const token = await issueToken("verify", `${player.entityId}|${player.email}`, VERIFY_TTL_SECONDS);
    await sendMailSafely(verifyEmailMail(player.email, player.firstName, token, language));
  }
}
