import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "tu_secreto_super_seguro_123";

export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
}

function isValidRole(value: unknown): value is UserRole {
  return value === "ADMIN" || value === "USER";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("orion_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string") {
      return null;
    }

    const payload = decoded as JwtPayload;
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;

    if (typeof userId !== "string" || typeof email !== "string" || !isValidRole(role)) {
      return null;
    }

    return { userId, email, role };
  } catch {
    return null;
  }
}
