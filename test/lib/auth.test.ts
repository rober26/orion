import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaMock } from "../helpers/prisma-mock";

const cookiesMock = vi.fn();
const verifyMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: verifyMock,
  },
}));

describe("lib/auth", () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    verifyMock.mockReset();
  });

  it("returns null when session cookie is missing", async () => {
    const prismaMock = createPrismaMock();
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));

    cookiesMock.mockResolvedValue({ get: () => undefined });

    const { getSessionUser } = await import("@/src/lib/auth");
    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("returns session user when token is valid", async () => {
    const prismaMock = createPrismaMock();
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));

    cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
    verifyMock.mockReturnValue({ userId: "u1", email: "u@x.com", role: "USER" });

    const { getSessionUser } = await import("@/src/lib/auth");
    await expect(getSessionUser()).resolves.toEqual({ userId: "u1", email: "u@x.com", role: "USER" });
  });

  it("returns active authenticated user", async () => {
    const prismaMock = createPrismaMock();
    const userDelegate = prismaMock.user as Record<string, ReturnType<typeof vi.fn>>;
    userDelegate.findUnique.mockResolvedValue({ id: "u1", email: "u@x.com", role: "USER", isActive: true });
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));

    cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
    verifyMock.mockReturnValue({ userId: "u1", email: "u@x.com", role: "USER" });

    const { getAuthenticatedUser } = await import("@/src/lib/auth");
    await expect(getAuthenticatedUser()).resolves.toEqual({ id: "u1", email: "u@x.com", role: "USER", isActive: true });
  });
});
