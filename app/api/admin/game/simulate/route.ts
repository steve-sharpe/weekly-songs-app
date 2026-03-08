import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { simulateNightPreview } from "@/lib/game";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as {
      design?: unknown;
      venueId?: string;
      bandIds?: string[];
      promoIds?: string[];
      week?: number;
      day?: number;
    };

    const simulation = await simulateNightPreview({
      design: body.design,
      venueId: body.venueId,
      bandIds: body.bandIds,
      promoIds: body.promoIds,
      week: body.week,
      day: body.day,
    });

    return NextResponse.json({ ok: true, simulation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
