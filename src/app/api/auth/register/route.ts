import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { badRequest, forbidden, json, parseJson, serverError } from "@/src/lib/http";
import prisma from "@/src/lib/prisma";
import { getAdminSettings } from "@/src/lib/admin-settings";
import { sendWelcomeEmail } from "@/src/lib/email";
import { normalizeEmail, normalizeName, normalizeUsername, validateEmail, validatePassword, validateUsername } from "@/src/lib/validation/auth";

type RegisterBody = {
  email?: unknown;
  username?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
};

export async function POST(request: Request) {
  try {
    const settings = await getAdminSettings();

    if (!settings.allowRegistration) {
      return forbidden("El registro publico esta deshabilitado");
    }

    const body = await parseJson<RegisterBody>(request);

    if (!body) {
      return badRequest("Formato de solicitud invalido");
    }

    const email = normalizeEmail(body.email);
    const username = normalizeUsername(body.username);
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = normalizeName(body.firstName);
    const lastName = normalizeName(body.lastName);

    const emailError = validateEmail(email);
    if (emailError) {
      return badRequest(emailError);
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return badRequest(usernameError);
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return badRequest(passwordError);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: UserRole.USER,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    try {
      await sendWelcomeEmail({ to: user.email, username: user.username });
    } catch (emailError) {
      console.error("WELCOME_EMAIL_ERROR", emailError);
    }

    return json({ message: "Registro exitoso", user }, 201);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: unknown }).code;
      if (code === "P2002") {
        return json({ error: "Email o username ya estan en uso" }, 409);
      }
    }

    console.error("REGISTER_ERROR", error);
    return serverError();
  }
}
