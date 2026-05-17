import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { generateRawToken, hashToken } from "@/src/lib/auth-token";
import { sendAccessSetupEmail } from "@/src/lib/email";

type AccessRequestRow = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  reviewedAt: Date | null;
  userId: string | null;
  reviewedBy: string | null;
};

type PrismaWithRequestAndToken = typeof prisma & {
  accessRequest: {
    findUnique(args: unknown): Promise<AccessRequestRow | null>;
    update(args: unknown): Promise<AccessRequestRow>;
  };
  authToken: {
    create(args: unknown): Promise<unknown>;
  };
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const prismaWithRequestAndToken = prisma as PrismaWithRequestAndToken;

    const existing = await prismaWithRequestAndToken.accessRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "La solicitud ya fue procesada" }, { status: 400 });
    }

    if (action === "reject") {
      const rejected = await prismaWithRequestAndToken.accessRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedBy: sessionUser.userId,
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          userId: true,
          reviewedBy: true,
        },
      });

      return NextResponse.json(rejected);
    }

    const duplicatedUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: existing.email }, { username: existing.username }],
      },
      select: { id: true },
    });

    if (duplicatedUser) {
      return NextResponse.json({ error: "Ya existe una cuenta con este email o username" }, { status: 409 });
    }

    const created = await prisma.user.create({
      data: {
        email: existing.email,
        username: existing.username,
        firstName: existing.firstName,
        lastName: existing.lastName,
        passwordHash: "PENDING_SETUP",
        role: "USER",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);

    await prismaWithRequestAndToken.authToken.create({
      data: {
        userId: created.id,
        type: "ACCESS_SETUP",
        tokenHash,
      },
    });

    const approved = await prismaWithRequestAndToken.accessRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: sessionUser.userId,
        userId: created.id,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        userId: true,
        reviewedBy: true,
      },
    });

    try {
      await sendAccessSetupEmail({
        to: created.email,
        username: created.username,
        token: rawToken,
      });
    } catch (emailError) {
      console.error("ACCESS_SETUP_EMAIL_ERROR", emailError);
    }

    return NextResponse.json(approved);
  } catch (error) {
    console.error("ADMIN_REVIEW_ACCESS_REQUEST_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
