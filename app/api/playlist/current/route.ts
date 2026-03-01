import { NextResponse } from "next/server";

import { getCurrentWeeklyPlaylist } from "@/lib/playlist";

export const runtime = "nodejs";

export async function GET() {
  try {
    const playlist = await getCurrentWeeklyPlaylist();
    return NextResponse.json({ playlist });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
