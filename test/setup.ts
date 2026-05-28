import { afterEach, beforeEach, vi } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});
