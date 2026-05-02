import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const AES_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const rawKey = process.env.APP_ENCRYPTION_KEY;

  if (!rawKey || rawKey.trim().length < 16) {
    throw new Error("APP_ENCRYPTION_KEY no configurada o invalida");
  }

  return createHash("sha256").update(rawKey).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(AES_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivRaw, authTagRaw, encryptedRaw] = payload.split(".");

  if (!ivRaw || !authTagRaw || !encryptedRaw) {
    throw new Error("Secreto cifrado invalido");
  }

  const iv = Buffer.from(ivRaw, "base64");
  const authTag = Buffer.from(authTagRaw, "base64");
  const encrypted = Buffer.from(encryptedRaw, "base64");
  const decipher = createDecipheriv(AES_ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function readStoredSecret(payload: string | null | undefined): string {
  if (!payload) {
    return "";
  }

  if (!payload.includes(".")) {
    return payload;
  }

  try {
    return decryptSecret(payload);
  } catch {
    return "";
  }
}
