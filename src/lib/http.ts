import { NextResponse } from "next/server";

export function json<T>(body: T, init?: ResponseInit | number) {
  if (typeof init === "number") {
    return NextResponse.json(body, { status: init });
  }

  return NextResponse.json(body, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "No autorizado") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Acceso denegado") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function serverError(message = "Error interno del servidor") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
