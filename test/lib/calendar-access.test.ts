import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaMock } from "../helpers/prisma-mock";

describe("lib/calendar-access", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calendarAccessWhere includes ownership and membership rules", async () => {
    const prismaMock = createPrismaMock();
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));
    const { calendarAccessWhere } = await import("@/src/lib/calendar-access");
    const where = calendarAccessWhere("u1") as { OR: unknown[] };
    expect(where.OR.length).toBe(3);
  });

  it("canViewCalendar resolves true when record exists", async () => {
    const prismaMock = createPrismaMock();
    const calendarDelegate = prismaMock.calendar as Record<string, ReturnType<typeof vi.fn>>;
    calendarDelegate.findFirst.mockResolvedValue({ id: "c1" });
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));
    const { canViewCalendar } = await import("@/src/lib/calendar-access");
    await expect(canViewCalendar("c1", "u1")).resolves.toBe(true);
  });

  it("ensureDefaultCalendar creates default when missing", async () => {
    const prismaMock = createPrismaMock();
    const txResult = { id: "c1", name: "Personal", color: "#2563eb" };

    (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: (tx: Record<string, unknown>) => unknown) => {
      const tx = createPrismaMock();
      const calendar = tx.calendar as Record<string, ReturnType<typeof vi.fn>>;
      calendar.findMany.mockResolvedValue([]);
      calendar.create.mockResolvedValue(txResult);
      return cb(tx as unknown as Record<string, unknown>);
    });

    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));
    const { ensureDefaultCalendar } = await import("@/src/lib/calendar-access");
    await expect(ensureDefaultCalendar("u1")).resolves.toEqual(txResult);
  });
});
