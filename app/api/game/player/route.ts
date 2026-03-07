import { NextRequest, NextResponse } from "next/server";

import { getOrCreatePlayer, getPlayer } from "@/lib/game";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name") ?? "";
    if (!name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const player = await getPlayer(name);
    if (!player) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = body.name ?? "";

    const player = await getOrCreatePlayer(name);
    return NextResponse.json({ player });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
