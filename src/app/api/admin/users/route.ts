import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, parseJson, serverError, unauthorized } from "@/src/lib/http";
import { normalizeEmail, normalizeName, normalizeUsername, validateEmail, validatePassword, validateUsername } from "@/src/lib/validation/auth";

type CreateAdminUserBody = {
  email?: unknown;
  username?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  role?: unknown;
  isActive?: unknown;
};

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return unauthorized();
    }

    if (sessionUser.role !== "ADMIN") {
      return forbidden();
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return json(users);
  } catch (error) {
    console.error("ADMIN_LIST_USERS_ERROR", error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return unauthorized();
    }

    if (sessionUser.role !== "ADMIN") {
      return forbidden();
    }

    const body = await parseJson<CreateAdminUserBody>(request);

    if (!body) {
      return badRequest("Formato de solicitud invalido");
    }

    const email = normalizeEmail(body.email);
    const username = normalizeUsername(body.username);
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = normalizeName(body.firstName);
    const lastName = normalizeName(body.lastName);
    const role = body.role;
    const isActive = body.isActive;

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

    if (role !== undefined && role !== UserRole.USER && role !== UserRole.ADMIN) {
      return badRequest("Rol invalido");
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return badRequest("isActive invalido");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role ?? UserRole.USER,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return json(user, 201);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: unknown }).code;
      if (code === "P2002") {
        return json({ error: "Email o username ya estan en uso" }, 409);
      }
    }

    console.error("ADMIN_CREATE_USER_ERROR", error);
    return serverError();
  }
}
