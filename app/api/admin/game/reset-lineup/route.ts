import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { resetGameDesignBandsAndVenuesToDefaults } from "@/lib/game-design";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const design = await resetGameDesignBandsAndVenuesToDefaults();
    return NextResponse.json({ ok: true, design });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
