import { describe, expect, it } from "vitest";
import { badRequest, forbidden, json, parseJson, serverError, unauthorized } from "@/src/lib/http";

describe("lib/http", () => {
  it("json supports numeric status shorthand", async () => {
    const response = json({ ok: true }, 201);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("error helpers return expected status codes", () => {
    expect(badRequest("x").status).toBe(400);
    expect(unauthorized().status).toBe(401);
    expect(forbidden().status).toBe(403);
    expect(serverError().status).toBe(500);
  });

  it("parseJson returns null for malformed body", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "{invalid",
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseJson<{ foo: string }>(request)).resolves.toBeNull();
  });
});
