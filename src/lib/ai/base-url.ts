import { isIP } from "node:net";
import type { AiProviderId } from "./constants";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const [aRaw, bRaw] = hostname.split(".");
  const a = Number(aRaw);
  const b = Number(bRaw);

  if (Number.isNaN(a) || Number.isNaN(b)) {
    return false;
  }

  if (a === 10 || a === 127) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  return a === 169 && b === 254;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
}

export function assertSafeAiBaseUrl(baseUrl: string, provider: AiProviderId): void {
  if (!isValidHttpUrl(baseUrl)) {
    throw new Error("Base URL invalida");
  }

  const allowPrivate = process.env.AI_ALLOW_PRIVATE_BASE_URLS === "true";

  if (allowPrivate || provider === "SELF_HOSTED_OPENAI") {
    return;
  }

  const host = new URL(baseUrl).hostname;

  if (isPrivateHostname(host)) {
    throw new Error(
      "Base URL privada o local no permitida para este proveedor. Usa SELF_HOSTED_OPENAI o define AI_ALLOW_PRIVATE_BASE_URLS=true.",
    );
  }
}
