import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    return NextResponse.json({
      authenticated: Boolean(user),
      user: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
          }
        : null,
    });
  } catch (error) {
    console.error("SESSION_STATUS_ERROR", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
