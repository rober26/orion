import { describe, expect, it } from "vitest";
import { eventIntersectsDay, getMonthOpacityClass, getViewDateRange, isEventStartOnDay } from "@/src/lib/calendar-utils";

describe("lib/calendar-utils", () => {
  it("returns correct range for week view", () => {
    const { from, to } = getViewDateRange(new Date("2026-05-27T10:00:00"), "week");

    expect(from.getDay()).toBe(1);
    expect(to.getDay()).toBe(0);
  });

  it("detects event intersections with day boundaries", () => {
    const day = new Date("2026-05-20T12:00:00");
    const start = new Date("2026-05-20T23:59:00");
    const end = new Date("2026-05-21T01:00:00");

    expect(eventIntersectsDay(start, end, day)).toBe(true);
    expect(isEventStartOnDay(start, day)).toBe(true);
  });

  it("returns opacity class for days outside month", () => {
    expect(getMonthOpacityClass(new Date("2026-06-01"), new Date("2026-05-01"))).toBe("opacity-35");
  });
});
