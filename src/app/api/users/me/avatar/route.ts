import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFromFile(file: File): string {
  const byMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };

  if (byMime[file.type]) {
    return byMime[file.type];
  }

  const name = file.name || "";
  const ext = path.extname(name).toLowerCase();

  return ext || ".jpg";
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa JPG, PNG, WEBP o GIF" }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json({ error: "El avatar no puede superar 5MB" }, { status: 400 });
    }

    const ext = extensionFromFile(file);
    const fileName = `${sessionUser.userId}-${randomUUID()}${ext}`;
    const relativePath = `/uploads/avatars/${fileName}`;
    const avatarsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    const absolutePath = path.join(avatarsDir, fileName);

    await fs.mkdir(avatarsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await fs.writeFile(absolutePath, Buffer.from(bytes));

    await prisma.user.update({
      where: { id: sessionUser.userId },
      data: { avatarUrl: relativePath },
    });

    return NextResponse.json({ avatarUrl: relativePath });
  } catch (error) {
    console.error("UPLOAD_AVATAR_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
