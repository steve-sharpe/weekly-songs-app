import { NextRequest, NextResponse } from "next/server";

import { syncTracksFromDrive } from "@/lib/google-drive";

export const runtime = "nodejs";

function isAdminAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return false;
  }

  const headerSecret = request.headers.get("x-admin-secret");
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  return headerSecret === secret || bearer === secret;
}

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
