import { promises as fs } from "fs";
import path from "path";

export interface AdminSettings {
  allowRegistration: boolean;
}

const DEFAULT_SETTINGS: AdminSettings = {
  allowRegistration: true,
};

function settingsPath() {
  return path.join(process.cwd(), "data", "admin-settings.json");
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const filePath = settingsPath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;

    return {
      allowRegistration:
        typeof parsed.allowRegistration === "boolean"
          ? parsed.allowRegistration
          : DEFAULT_SETTINGS.allowRegistration,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setAdminSettings(next: AdminSettings): Promise<AdminSettings> {
  const filePath = settingsPath();
  const dirPath = path.dirname(filePath);

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  return next;
}
