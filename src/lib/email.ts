import { Resend } from "resend";

interface WelcomeEmailInput {
  to: string;
  username: string;
}

interface AccessSetupEmailInput {
  to: string;
  username: string;
  token: string;
}

interface PasswordResetEmailInput {
  to: string;
  username: string;
  token: string;
}

function getEnv(name: "RESEND_API_KEY" | "EMAIL_FROM" | "APP_URL"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildWelcomeEmailHtml(username: string, appUrl: string): string {
  const safeName = username.trim() || "usuario";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a; line-height: 1.5;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Bienvenido a Orion, ${safeName}</h1>
      <p style="margin: 0 0 12px;">Tu cuenta ya esta activa y lista para usarse.</p>
      <p style="margin: 0 0 24px;">Desde Orion podras organizar proyectos, notas y calendarios en un solo lugar.</p>
      <a href="${appUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Entrar a Orion</a>
      <p style="margin-top: 24px; font-size: 13px; color: #475569;">Si no creaste esta cuenta, ignora este mensaje.</p>
    </div>
  `;
}

function buildWelcomeEmailText(username: string, appUrl: string): string {
  const safeName = username.trim() || "usuario";

  return [
    `Bienvenido a Orion, ${safeName}.`,
    "",
    "Tu cuenta ya esta activa y lista para usarse.",
    "Desde Orion podras organizar proyectos, notas y calendarios en un solo lugar.",
    "",
    `Entra aqui: ${appUrl}`,
    "",
    "Si no creaste esta cuenta, ignora este mensaje.",
  ].join("\n");
}

function buildAccessSetupUrl(token: string): string {
  const appUrl = getEnv("APP_URL");
  return `${appUrl.replace(/\/$/, "")}/complete-access?token=${encodeURIComponent(token)}`;
}

function buildPasswordResetUrl(token: string): string {
  const appUrl = getEnv("APP_URL");
  return `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  const apiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("EMAIL_FROM");
  const appUrl = getEnv("APP_URL");

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: [input.to],
    subject: "Bienvenido a Orion",
    html: buildWelcomeEmailHtml(input.username, appUrl),
    text: buildWelcomeEmailText(input.username, appUrl),
  });
}

export async function sendAccessSetupEmail(input: AccessSetupEmailInput): Promise<void> {
  const apiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("EMAIL_FROM");
  const link = buildAccessSetupUrl(input.token);
  const safeName = input.username.trim() || "usuario";
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: [input.to],
    subject: "Tu acceso a Orion fue aprobado",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a; line-height: 1.5;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Hola, ${safeName}</h1>
        <p style="margin: 0 0 12px;">Tu solicitud de acceso a Orion fue aprobada.</p>
        <p style="margin: 0 0 24px;">Para activar tu cuenta, define tu contraseña desde el siguiente enlace:</p>
        <a href="${link}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Definir contraseña</a>
        <p style="margin-top: 24px; font-size: 13px; color: #475569;">Este enlace es de un solo uso.</p>
      </div>
    `,
    text: [
      `Hola, ${safeName}.`,
      "",
      "Tu solicitud de acceso a Orion fue aprobada.",
      "Define tu contraseña desde este enlace:",
      link,
      "",
      "Este enlace es de un solo uso.",
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  const apiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("EMAIL_FROM");
  const link = buildPasswordResetUrl(input.token);
  const safeName = input.username.trim() || "usuario";
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: [input.to],
    subject: "Recuperar contraseña de Orion",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a; line-height: 1.5;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Restablecer contraseña</h1>
        <p style="margin: 0 0 12px;">Hola, ${safeName}. Recibimos una solicitud para cambiar tu contraseña.</p>
        <p style="margin: 0 0 24px;">Puedes restablecerla desde este enlace (válido por 30 minutos):</p>
        <a href="${link}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Restablecer contraseña</a>
        <p style="margin-top: 24px; font-size: 13px; color: #475569;">Si no solicitaste este cambio, ignora este mensaje.</p>
      </div>
    `,
    text: [
      `Hola, ${safeName}.`,
      "",
      "Recibimos una solicitud para cambiar tu contraseña.",
      "Restablecela desde este enlace (válido por 30 minutos):",
      link,
      "",
      "Si no solicitaste este cambio, ignora este mensaje.",
    ].join("\n"),
  });
}
