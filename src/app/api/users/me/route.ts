import { ProfileVisibility } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/src/lib/http";

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function formatProfile<T extends { id: string; firstName: string | null; lastName: string | null; username: string }>(
  user: T,
) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username;
  const tag = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();

  return {
    ...user,
    name,
    tag,
  };
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        profileVisibility: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return json({ error: "Usuario no existe" }, 404);
    }

    return json(formatProfile(user));
  } catch (error) {
    console.error("GET_PROFILE_ERROR", error);
    return serverError();
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return unauthorized();
    }

    const body = await request.json();

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : null;
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : null;
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : null;
    const bio = typeof body.bio === "string" ? body.bio.trim() : null;
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : null;
    const profileVisibility = body.profileVisibility;

    if (username !== null && username.length > 0 && username.length < 3) {
      return badRequest("El username debe tener al menos 3 caracteres");
    }

    if (bio !== null && bio.length > 300) {
      return badRequest("La bio no puede superar los 300 caracteres");
    }

    if (
      profileVisibility !== undefined &&
      profileVisibility !== ProfileVisibility.PUBLIC &&
      profileVisibility !== ProfileVisibility.PRIVATE
    ) {
      return badRequest("Visibilidad inválida");
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.userId },
      data: {
        firstName: firstName === null || firstName.length === 0 ? null : firstName,
        lastName: lastName === null || lastName.length === 0 ? null : lastName,
        username: username === null || username.length === 0 ? undefined : username,
        bio: bio === null || bio.length === 0 ? null : bio,
        avatarUrl: avatarUrl === null || avatarUrl.length === 0 ? null : avatarUrl,
        profileVisibility:
          profileVisibility === undefined ? undefined : (profileVisibility as ProfileVisibility),
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        profileVisibility: true,
        role: true,
        isActive: true,
      },
    });

    return json(formatProfile(updatedUser));
  } catch (error: unknown) {
    if (getPrismaErrorCode(error) === "P2002") {
      return json({ error: "El username ya está en uso" }, 409);
    }

    console.error("PATCH_PROFILE_ERROR", error);
    return serverError();
  }
}
