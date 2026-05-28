import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();

describe("api/auth/session", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthenticatedUserMock.mockReset();
  });

  it("returns unauthenticated payload when no user", async () => {
    vi.doMock("@/src/lib/auth", () => ({ getAuthenticatedUser: getAuthenticatedUserMock }));
    getAuthenticatedUserMock.mockResolvedValue(null);

    const { GET } = await import("@/src/app/api/auth/session/route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ authenticated: false, user: null });
  });

  it("returns authenticated payload for active user", async () => {
    vi.doMock("@/src/lib/auth", () => ({ getAuthenticatedUser: getAuthenticatedUserMock }));
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1", email: "u@x.com", role: "USER" });

    const { GET } = await import("@/src/app/api/auth/session/route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ authenticated: true, user: { id: "u1", email: "u@x.com", role: "USER" } });
  });
});
