import { NextResponse } from "next/server";

import { getGuestBookingSlots } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const guestBookingSlots = (await getGuestBookingSlots()).map((slot) => ({
      dateKey: slot.dateKey,
      dateLabel: slot.dateLabel,
      isFeatureBooked: Boolean(slot.featureGuestName),
      isMusicalBooked: Boolean(slot.musicalGuestName),
    }));

    return NextResponse.json({ guestBookingSlots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
