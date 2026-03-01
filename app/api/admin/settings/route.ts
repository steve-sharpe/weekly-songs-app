import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { getTickerText, setTickerText } from "@/lib/settings";

export const runtime = "nodejs";

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
