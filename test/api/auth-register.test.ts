import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaMock } from "../helpers/prisma-mock";

const hashMock = vi.fn(async () => "hashed");
const getAdminSettingsMock = vi.fn();
const sendWelcomeEmailMock = vi.fn(async () => undefined);

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
  },
}));

describe("api/auth/register", () => {
  beforeEach(() => {
    vi.resetModules();
    hashMock.mockClear();
    getAdminSettingsMock.mockReset();
    sendWelcomeEmailMock.mockReset();
  });

  it("returns 403 when public registration is disabled", async () => {
    const prismaMock = createPrismaMock();
    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));
    vi.doMock("@/src/lib/admin-settings", () => ({ getAdminSettings: getAdminSettingsMock }));
    vi.doMock("@/src/lib/email", () => ({ sendWelcomeEmail: sendWelcomeEmailMock }));
    getAdminSettingsMock.mockResolvedValue({ allowRegistration: false });

    const { POST } = await import("@/src/app/api/auth/register/route");
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", username: "abc", password: "12345678" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 201 when registration succeeds", async () => {
    const prismaMock = createPrismaMock();
    const userDelegate = prismaMock.user as Record<string, ReturnType<typeof vi.fn>>;
    userDelegate.create.mockResolvedValue({ id: "u1", username: "abc", email: "a@b.com", role: "USER" });

    vi.doMock("@/src/lib/prisma", () => ({ default: prismaMock }));
    vi.doMock("@/src/lib/admin-settings", () => ({ getAdminSettings: getAdminSettingsMock }));
    vi.doMock("@/src/lib/email", () => ({ sendWelcomeEmail: sendWelcomeEmailMock }));
    getAdminSettingsMock.mockResolvedValue({ allowRegistration: true });

    const { POST } = await import("@/src/app/api/auth/register/route");
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", username: "abc", password: "12345678" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(sendWelcomeEmailMock).toHaveBeenCalled();
  });
});
