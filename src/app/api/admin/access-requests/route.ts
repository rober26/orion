import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

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

type PrismaWithAccessRequest = typeof prisma & {
  accessRequest: {
    findMany(args: unknown): Promise<AccessRequestRow[]>;
  };
};

export async function GET() {
  try {
    const prismaWithAccessRequest = prisma as PrismaWithAccessRequest;
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const requests = await prismaWithAccessRequest.accessRequest.findMany({
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(requests);
  } catch (error) {
    console.error("ADMIN_ACCESS_REQUESTS_LIST_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
