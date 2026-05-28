import { beforeEach, describe, expect, it, vi } from "vitest";

const readFileMock = vi.fn();
const writeFileMock = vi.fn();
const mkdirMock = vi.fn();

vi.mock("fs", () => ({
  promises: {
    readFile: readFileMock,
    writeFile: writeFileMock,
    mkdir: mkdirMock,
  },
}));

describe("lib/admin-settings", () => {
  beforeEach(() => {
    vi.resetModules();
    readFileMock.mockReset();
    writeFileMock.mockReset();
    mkdirMock.mockReset();
  });

  it("returns defaults when file cannot be read", async () => {
    readFileMock.mockRejectedValue(new Error("missing"));
    const { getAdminSettings } = await import("@/src/lib/admin-settings");
    await expect(getAdminSettings()).resolves.toEqual({ allowRegistration: true });
  });

  it("reads existing settings from file", async () => {
    readFileMock.mockResolvedValue('{"allowRegistration":false}');
    const { getAdminSettings } = await import("@/src/lib/admin-settings");
    await expect(getAdminSettings()).resolves.toEqual({ allowRegistration: false });
  });

  it("writes admin settings file", async () => {
    const { setAdminSettings } = await import("@/src/lib/admin-settings");
    await expect(setAdminSettings({ allowRegistration: false })).resolves.toEqual({ allowRegistration: false });
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalled();
  });
});
