import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const notebooks = await prisma.notebook.findMany({
      include: {
        _count: { select: { documents: true } },
        folder: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(notebooks);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener notebooks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, folderId, ownerId, creatorId, color, icon } = body;

    const notebook = await prisma.notebook.create({
      data: {
        title,
        description,
        folderId: folderId || null,
        ownerId,
        creatorId,
        color: color || "#3b82f6",
        icon: icon || "Book"
      },
    });

    return NextResponse.json(notebook);
  } catch (error) {
    console.error("PRISMA ERROR:", error);
    return NextResponse.json({ error: "Error al crear notebook" }, { status: 500 });
  }
}