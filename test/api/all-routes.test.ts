import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HTTP_METHOD_EXPORTS = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"] as const;

async function collectRouteFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRouteFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

describe("api routes exports", () => {
  it("all API route modules export at least one HTTP handler", async () => {
    const apiRoot = path.join(process.cwd(), "src", "app", "api");
    const files = await collectRouteFiles(apiRoot);

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const routeModule = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      const handlerCount = HTTP_METHOD_EXPORTS.filter((key) => typeof routeModule[key] === "function").length;
      expect(handlerCount, `route without handlers: ${file}`).toBeGreaterThan(0);
    }
  });
});
