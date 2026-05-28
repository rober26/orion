const EMAIL_MIN_LENGTH = 5;
const USERNAME_MIN_LENGTH = 3;
const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateEmail(email: string): string | null {
  if (!email) {
    return "Email obligatorio";
  }

  if (email.length < EMAIL_MIN_LENGTH || !email.includes("@")) {
    return "Email invalido";
  }

  return null;
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return "Username obligatorio";
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return "El username debe tener al menos 3 caracteres";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Contrasena obligatoria";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return "La contrasena debe tener al menos 8 caracteres";
  }

  return null;
}

export function getInvalidSessionMessage(): string {
  return "Sesion invalida. Inicia sesion de nuevo";
}
