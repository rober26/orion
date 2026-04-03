import { NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/auth";
import { getAdminSettings, setAdminSettings } from "@/src/lib/admin-settings";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const settings = await getAdminSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("ADMIN_GET_SETTINGS_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();

    if (typeof body.allowRegistration !== "boolean") {
      return NextResponse.json({ error: "allowRegistration inválido" }, { status: 400 });
    }

    const nextSettings = await setAdminSettings({ allowRegistration: body.allowRegistration });

    return NextResponse.json(nextSettings);
  } catch (error) {
    console.error("ADMIN_UPDATE_SETTINGS_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
