import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { syncTracksFromDrive } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncTracksFromDrive();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
