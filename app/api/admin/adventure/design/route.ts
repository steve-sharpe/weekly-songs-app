import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { getAdventureDesignWithSongBands, saveAdventureDesign } from "@/lib/adventure-design";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const design = await getAdventureDesignWithSongBands();
    return NextResponse.json({ design });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as { design?: unknown };
    const design = await saveAdventureDesign(body.design);
    return NextResponse.json({ ok: true, design });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
