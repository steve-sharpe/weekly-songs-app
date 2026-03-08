import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { resetBookingPlayers } from "@/lib/game";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const deletedPlayers = await resetBookingPlayers();
    return NextResponse.json({ ok: true, deletedPlayers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
