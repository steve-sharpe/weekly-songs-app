import { NextRequest, NextResponse } from "next/server";

import { GameAction, performGameAction } from "@/lib/game";

export const runtime = "nodejs";

const ALLOWED_ACTIONS: GameAction[] = ["fight", "rest", "buy_potion", "use_potion"];

function isGameAction(value: string): value is GameAction {
  return ALLOWED_ACTIONS.includes(value as GameAction);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      action?: string;
    };

    const name = body.name ?? "";
    const action = body.action ?? "";

    if (!name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!isGameAction(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const result = await performGameAction(name, action);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
