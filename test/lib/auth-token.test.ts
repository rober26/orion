import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { generateRawToken, hashToken } from "@/src/lib/auth-token";

describe("lib/auth-token", () => {
  it("generateRawToken creates long random hex token", () => {
    const token = generateRawToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashToken matches sha256 digest", () => {
    const token = "my-token";
    const expected = crypto.createHash("sha256").update(token).digest("hex");

    expect(hashToken(token)).toBe(expected);
  });
});
