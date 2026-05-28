import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaMock } from "../helpers/prisma-mock";

describe("lib/session-user", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("resolves by user id when present", async () => {
    const prismaMock = createPrismaMock();
    const user = prismaMock.user as Record<string, ReturnType<typeof vi.fn>>;
    user.findUnique.mockResolvedValueOnce({ id: "u1" });
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));

    const { resolveSessionUserId } = await import("@/src/lib/session-user");
    await expect(resolveSessionUserId({ userId: "u1", email: "u@test.dev", role: "USER" })).resolves.toBe("u1");
  });

  it("falls back to email lookup", async () => {
    const prismaMock = createPrismaMock();
    const user = prismaMock.user as Record<string, ReturnType<typeof vi.fn>>;
    user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "u2" });
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));

    const { resolveSessionUserId } = await import("@/src/lib/session-user");
    await expect(resolveSessionUserId({ userId: "missing", email: "u@test.dev", role: "USER" })).resolves.toBe("u2");
  });
});
