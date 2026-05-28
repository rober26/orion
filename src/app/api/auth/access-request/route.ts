import prisma from "@/src/lib/prisma";
import { badRequest, json, parseJson, serverError } from "@/src/lib/http";
import { normalizeEmail, normalizeName, normalizeUsername, validateEmail, validateUsername } from "@/src/lib/validation/auth";

type PrismaWithAccessRequest = typeof prisma & {
  accessRequest: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
    create(args: unknown): Promise<unknown>;
  };
};

export async function POST(request: Request) {
  try {
    const prismaWithAccessRequest = prisma as PrismaWithAccessRequest;
    const body = await parseJson<{
      email?: unknown;
      username?: unknown;
      firstName?: unknown;
      lastName?: unknown;
    }>(request);

    if (!body) {
      return badRequest("Formato de solicitud invalido");
    }

    const email = normalizeEmail(body.email);
    const username = normalizeUsername(body.username);
    const firstName = normalizeName(body.firstName);
    const lastName = normalizeName(body.lastName);

    if (!email || !username || !firstName || !lastName) {
      return badRequest("Todos los campos son obligatorios");
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return badRequest(emailError);
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return badRequest(usernameError);
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true },
    });

    if (existingUser) {
      return json({ error: "Ya existe una cuenta con esos datos" }, 409);
    }

    const pending = await prismaWithAccessRequest.accessRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [{ email }, { username }],
      },
      select: { id: true },
    });

    if (pending) {
      return json({ error: "Ya tienes una solicitud pendiente" }, 409);
    }

    await prismaWithAccessRequest.accessRequest.create({
      data: {
        email,
        username,
        firstName,
        lastName,
      },
    });

    return json({ message: "Solicitud enviada correctamente" }, 201);
  } catch (error) {
    console.error("ACCESS_REQUEST_CREATE_ERROR", error);
    return serverError();
  }
}
