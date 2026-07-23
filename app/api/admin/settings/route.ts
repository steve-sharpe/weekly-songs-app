import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { getGuestBookingSlots, getTickerText, setGuestBookingSlots, setTickerText } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const [tickerText, guestBookingSlots] = await Promise.all([getTickerText(), getGuestBookingSlots()]);
    return NextResponse.json({ tickerText, guestBookingSlots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type SettingsPayload = {
  tickerText?: string;
  guestBookingSlots?: unknown;
};

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const payload = (await request.json()) as SettingsPayload;
    const tickerText =
      typeof payload.tickerText === "string" ? await setTickerText(payload.tickerText) : await getTickerText();
    const guestBookingSlots = Array.isArray(payload.guestBookingSlots)
      ? await setGuestBookingSlots(payload.guestBookingSlots as Parameters<typeof setGuestBookingSlots>[0])
      : await getGuestBookingSlots();

    return NextResponse.json({ ok: true, tickerText, guestBookingSlots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
