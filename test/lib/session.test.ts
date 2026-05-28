import { describe, expect, it, vi } from "vitest";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "signed-token"),
  },
}));

describe("lib/session", () => {
  it("getJwtSecret returns env value", async () => {
    process.env.JWT_SECRET = "top-secret";
    const { getJwtSecret } = await import("@/src/lib/session");
    expect(getJwtSecret()).toBe("top-secret");
  });

  it("getJwtSecret returns dev fallback", async () => {
    delete process.env.JWT_SECRET;
    const { getJwtSecret } = await import("@/src/lib/session");
    expect(getJwtSecret()).toBe("dev-jwt-secret-change-me");
  });

  it("signSessionToken delegates to jwt.sign", async () => {
    process.env.JWT_SECRET = "abc";
    const { signSessionToken } = await import("@/src/lib/session");
    const token = signSessionToken({ userId: "u1", email: "u@x.com", role: "USER" as const });
    expect(token).toBe("signed-token");
  });

  it("setSessionCookie and clearSessionCookie set cookie", async () => {
    const { clearSessionCookie, setSessionCookie } = await import("@/src/lib/session");
    const { NextResponse } = await import("next/server");
    const response = NextResponse.json({ ok: true });

    setSessionCookie(response, "abc");
    expect(response.headers.get("set-cookie")).toContain("orion_session=abc");

    clearSessionCookie(response);
    expect(response.headers.get("set-cookie")).toContain("orion_session=");
  });
});
