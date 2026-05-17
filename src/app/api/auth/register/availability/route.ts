import { NextResponse } from "next/server";
import { getAdminSettings } from "@/src/lib/admin-settings";

export async function GET() {
  try {
    const settings = await getAdminSettings();
    return NextResponse.json({ allowRegistration: settings.allowRegistration });
  } catch (error) {
    console.error("REGISTER_AVAILABILITY_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
