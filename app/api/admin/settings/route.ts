import { NextRequest, NextResponse } from "next/server";

import { getTickerText, setTickerText } from "@/lib/settings";

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

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tickerText = await getTickerText();
    return NextResponse.json({ tickerText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type SettingsPayload = {
  tickerText?: string;
};

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as SettingsPayload;
    const tickerText = await setTickerText(payload.tickerText ?? "");

    return NextResponse.json({ ok: true, tickerText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
