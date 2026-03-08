import { NextRequest, NextResponse } from "next/server";

import { createOrLoadPlayerState, getPlayerState } from "@/lib/game";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name") ?? "";
    if (!name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const state = await getPlayerState(name);
    if (!state) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = body.name ?? "";

    const state = await createOrLoadPlayerState(name);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
