import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { syncTracksFromDrive } from "@/lib/google-drive";
import { generateWeeklyPlaylist } from "@/lib/playlist";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const sync = await syncTracksFromDrive();
    const playlist = await generateWeeklyPlaylist();

    return NextResponse.json({
      ok: true,
      sync,
      playlist,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
