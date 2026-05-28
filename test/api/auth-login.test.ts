import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaMock } from "../helpers/prisma-mock";

const compareMock = vi.fn();
const signSessionTokenMock = vi.fn(() => "signed-token");
const setSessionCookieMock = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    compare: compareMock,
  },
}));

describe("api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    compareMock.mockReset();
    signSessionTokenMock.mockReset();
    setSessionCookieMock.mockReset();
    signSessionTokenMock.mockReturnValue("signed-token");
  });

  it("returns 401 when credentials are missing", async () => {
    const prismaMock = createPrismaMock();
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));
    vi.doMock("@/src/lib/session", () => ({ signSessionToken: signSessionTokenMock, setSessionCookie: setSessionCookieMock }));

    const { POST } = await import("@/src/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "", password: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 and sets cookie when credentials are valid", async () => {
    const prismaMock = createPrismaMock();
    const userDelegate = prismaMock.user as Record<string, ReturnType<typeof vi.fn>>;
    userDelegate.findUnique.mockResolvedValue({
      id: "u1",
      email: "user@test.dev",
      username: "user",
      passwordHash: "hash",
      role: "USER",
    });
    compareMock.mockResolvedValue(true);

    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));
    vi.doMock("@/src/lib/session", () => ({ signSessionToken: signSessionTokenMock, setSessionCookie: setSessionCookieMock }));

    const { POST } = await import("@/src/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "USER@TEST.DEV", password: "secret" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(signSessionTokenMock).toHaveBeenCalled();
    expect(setSessionCookieMock).toHaveBeenCalled();
  });
});
