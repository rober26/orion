import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { SessionUser } from "@/src/lib/auth";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.trim().length > 0) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET no está configurado");
  }

  return "dev-jwt-secret-change-me";
}

export function signSessionToken(payload: SessionUser): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set("orion_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set("orion_session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
}
