import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  isOpenAt,
  isValidTimeZone,
  localDate,
  localDayRange,
  localParts,
  zonedTimeToUtc,
} from "../src/services/time";

const TZ = "Europe/Belgrade";

describe("local time", () => {
  it("reads local parts, with Monday as 0", () => {
    // Summer time: UTC+2.
    expect(localParts(new Date("2026-10-09T16:00:00Z"), TZ)).toEqual({
      year: 2026,
      month: 10,
      day: 9,
      hour: 18,
      weekday: 4,
    });
    // Winter time: UTC+1.
    expect(localParts(new Date("2026-11-01T16:00:00Z"), TZ)).toEqual({
      year: 2026,
      month: 11,
      day: 1,
      hour: 17,
      weekday: 6,
    });
    // Midnight is hour 0, not 24.
    expect(localParts(new Date("2026-10-09T22:00:00Z"), TZ).hour).toBe(0);
  });

  it("converts a wall-clock time back to UTC", () => {
    expect(zonedTimeToUtc(2026, 7, 1, 18, TZ).toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(zonedTimeToUtc(2026, 12, 1, 18, TZ).toISOString()).toBe("2026-12-01T17:00:00.000Z");
    // Day 32 rolls over to the next month.
    expect(zonedTimeToUtc(2026, 10, 32, 0, TZ).toISOString()).toBe("2026-10-31T23:00:00.000Z");
  });

  it("has 25 hours on the day the clocks go back and 23 on the day they go forward", () => {
    const fall = localDayRange("2026-10-25", TZ);
    expect((fall.end.getTime() - fall.start.getTime()) / 3_600_000).toBe(25);
    expect(fall.start.toISOString()).toBe("2026-10-24T22:00:00.000Z");

    const spring = localDayRange("2026-03-29", TZ);
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(23);
    expect(spring.start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
  });

  it("keeps a weekly booking at the same wall-clock time across a clock change", () => {
    // 18:00 on Saturday 24 October (summer time) and the same time a week later (winter time).
    const first = new Date("2026-10-24T16:00:00Z");
    expect(addLocalDays(first, 7, TZ).toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(localDate(addLocalDays(first, 7, TZ), TZ)).toBe("2026-10-31");
  });

  it("checks opening hours in local time", () => {
    const hours = Array.from({ length: 7 }, () => ({ open: "08:00", close: "22:00" }));
    // 06:00 UTC is 08:00 in Belgrade in summer: open. 05:00 UTC is 07:00: closed. 20:00 UTC is 22:00: closed.
    expect(isOpenAt(hours, new Date("2026-10-09T06:00:00Z"), TZ)).toBe(true);
    expect(isOpenAt(hours, new Date("2026-10-09T05:00:00Z"), TZ)).toBe(false);
    expect(isOpenAt(hours, new Date("2026-10-09T19:00:00Z"), TZ)).toBe(true);
    expect(isOpenAt(hours, new Date("2026-10-09T20:00:00Z"), TZ)).toBe(false);
    // A day that is closed all day.
    const closedFriday = hours.map((day, index) => (index === 4 ? null : day));
    expect(isOpenAt(closedFriday, new Date("2026-10-09T10:00:00Z"), TZ)).toBe(false);
  });

  it("knows which zone names exist", () => {
    expect(isValidTimeZone("Europe/Belgrade")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
