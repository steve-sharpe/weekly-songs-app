import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { ensureSchema, getSql } from "@/lib/db";
import { streamDriveFileById } from "@/lib/google-drive";

export const runtime = "nodejs";

type TrackRow = {
  id: number;
  drive_file_id: string;
  mime_type: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ trackId: string }> },
) {
  try {
    await ensureSchema();
    const sql = getSql();

    const { trackId } = await context.params;
    const parsedTrackId = Number.parseInt(trackId, 10);
    if (!Number.isFinite(parsedTrackId) || parsedTrackId <= 0) {
      return NextResponse.json({ error: "Invalid track id" }, { status: 400 });
    }

    const rows = (await sql`
      SELECT id, drive_file_id, mime_type
      FROM tracks
      WHERE id = ${parsedTrackId}
        AND is_active = TRUE
      LIMIT 1;
    `) as TrackRow[];

    const track = rows[0];
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const { stream, contentType, contentLength } = await streamDriveFileById(
      track.drive_file_id,
    );

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentType || track.mime_type || "audio/mpeg",
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
