import { NextRequest, NextResponse } from "next/server";

import { syncTracksFromDrive } from "@/lib/google-drive";
import { generateWeeklyPlaylist } from "@/lib/playlist";

export const runtime = "nodejs";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  return bearer === secret;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const syncResult = await syncTracksFromDrive();
    const playlist = await generateWeeklyPlaylist();
    return NextResponse.json({ ok: true, sync: syncResult, playlist });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
