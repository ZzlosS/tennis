export type NotificationType =
  | "BOOKING_REMINDER"
  | "BOOKING_CANCELLED"
  | "PARTNER_JOINED"
  | "MATCH_TO_CONFIRM"
  | "MATCH_CONFIRMED"
  | "MATCH_DISPUTED"
  | "HANDOVER_REQUESTED"
  | "HANDOVER_ANSWERED";

export type Language = "en" | "sr";

export interface Params {
  // Who did it (a nickname), the place, the time as the player reads it, and so on.
  who?: string;
  court?: string;
  club?: string;
  when?: string;
  answer?: "ACCEPTED" | "DECLINED";
  // The time of a booking, which is written out in the receiver's language and in the court's own time zone.
  startsAt?: Date;
  timeZone?: string;
}

export function formatWhen(date: Date, timeZone: string, language: Language): string {
  return new Intl.DateTimeFormat(language === "sr" ? "sr-Latn-RS" : "en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

type Template = (params: Params) => { title: string; body: string };

const at = (params: Params) => [params.court, params.club].filter(Boolean).join(", ");

const en: Record<NotificationType, Template> = {
  BOOKING_REMINDER: (p) => ({ title: "Your court is booked soon", body: `${at(p)} at ${p.when}` }),
  BOOKING_CANCELLED: (p) => ({ title: "Booking cancelled", body: `${at(p)} at ${p.when} was cancelled` }),
  PARTNER_JOINED: (p) => ({ title: "Someone joined you", body: `${p.who} will play with you on ${p.when}` }),
  MATCH_TO_CONFIRM: (p) => ({ title: "Confirm the score", body: `${p.who} entered the score of your match` }),
  MATCH_CONFIRMED: (p) => ({ title: "Score confirmed", body: `${p.who} confirmed your match score` }),
  MATCH_DISPUTED: (p) => ({ title: "Score disputed", body: `${p.who} does not agree with the score` }),
  HANDOVER_REQUESTED: (p) => ({
    title: "A court wants to join your club",
    body: `${p.who} asks ${p.club} to take over ${p.court}`,
  }),
  HANDOVER_ANSWERED: (p) => ({
    title: "Court handover answered",
    body: `${p.club} ${p.answer === "ACCEPTED" ? "took over" : "declined to take over"} ${p.court}`,
  }),
};

const sr: Record<NotificationType, Template> = {
  BOOKING_REMINDER: (p) => ({ title: "Uskoro igraš", body: `${at(p)} u ${p.when}` }),
  BOOKING_CANCELLED: (p) => ({ title: "Rezervacija otkazana", body: `${at(p)} u ${p.when} je otkazana` }),
  PARTNER_JOINED: (p) => ({ title: "Neko ti se pridružio", body: `${p.who} igra sa tobom ${p.when}` }),
  MATCH_TO_CONFIRM: (p) => ({ title: "Potvrdi rezultat", body: `${p.who} je uneo/la rezultat vašeg meča` }),
  MATCH_CONFIRMED: (p) => ({ title: "Rezultat potvrđen", body: `${p.who} je potvrdio/la rezultat meča` }),
  MATCH_DISPUTED: (p) => ({ title: "Rezultat osporen", body: `${p.who} se ne slaže sa rezultatom` }),
  HANDOVER_REQUESTED: (p) => ({
    title: "Teren želi u vaš klub",
    body: `${p.who} traži da ${p.club} preuzme teren ${p.court}`,
  }),
  HANDOVER_ANSWERED: (p) => ({
    title: "Odgovor na predaju terena",
    body: `${p.club}: ${p.answer === "ACCEPTED" ? "teren je preuzet" : "preuzimanje odbijeno"} (${p.court})`,
  }),
};

export function render(type: NotificationType, language: Language, params: Params) {
  const when = params.startsAt ? formatWhen(params.startsAt, params.timeZone ?? "UTC", language) : params.when;
  return (language === "sr" ? sr : en)[type]({ ...params, when });
}
