import { NextResponse } from "next/server";

import { getAdventureDesignWithSongBands } from "@/lib/adventure-design";

export const runtime = "nodejs";

export async function GET() {
  try {
    const design = await getAdventureDesignWithSongBands();
    return NextResponse.json({ design });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
