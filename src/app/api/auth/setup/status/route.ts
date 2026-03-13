// src/app/api/auth/setup/status/route.ts
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ hasAdmin: userCount > 0 });
  } catch (error) {
    return NextResponse.json({ hasAdmin: true }); 
  }
}