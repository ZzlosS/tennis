import { config } from "../config";
import { Mail } from "./mailer";

export type Language = "en" | "sr";

const page = (body: string) => `<div style="font-family:sans-serif;max-width:480px;margin:auto">${body}</div>`;

const button = (url: string, label: string) =>
  `<p><a href="${url}" style="background:#1b5e20;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${label}</a></p>`;

export const resetLink = (token: string) => `${config.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
export const verifyLink = (token: string) => `${config.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

export function passwordResetMail(to: string, firstName: string, token: string, language: Language): Mail {
  const url = resetLink(token);
  if (language === "sr") {
    return {
      to,
      subject: "Promena lozinke",
      text: `Zdravo ${firstName},\n\nZatražena je promena lozinke. Link važi 1 sat:\n${url}\n\nAko to nisi bio ti, slobodno ignoriši ovu poruku.`,
      html: page(
        `<p>Zdravo ${firstName},</p><p>Zatražena je promena lozinke. Link važi 1 sat.</p>${button(url, "Promeni lozinku")}<p>Ako to nisi bio ti, slobodno ignoriši ovu poruku.</p>`
      ),
    };
  }
  return {
    to,
    subject: "Reset your password",
    text: `Hi ${firstName},\n\nSomeone asked to reset your password. The link works for 1 hour:\n${url}\n\nIf this wasn't you, you can ignore this email.`,
    html: page(
      `<p>Hi ${firstName},</p><p>Someone asked to reset your password. The link works for 1 hour.</p>${button(url, "Reset password")}<p>If this wasn't you, you can ignore this email.</p>`
    ),
  };
}

export function verifyEmailMail(to: string, firstName: string, token: string, language: Language): Mail {
  const url = verifyLink(token);
  if (language === "sr") {
    return {
      to,
      subject: "Potvrdi email adresu",
      text: `Zdravo ${firstName},\n\nPotvrdi email adresu klikom na link (važi 24 sata):\n${url}`,
      html: page(
        `<p>Zdravo ${firstName},</p><p>Potvrdi email adresu. Link važi 24 sata.</p>${button(url, "Potvrdi email")}`
      ),
    };
  }
  return {
    to,
    subject: "Confirm your email address",
    text: `Hi ${firstName},\n\nConfirm your email address with this link (it works for 24 hours):\n${url}`,
    html: page(
      `<p>Hi ${firstName},</p><p>Confirm your email address. The link works for 24 hours.</p>${button(url, "Confirm email")}`
    ),
  };
}
