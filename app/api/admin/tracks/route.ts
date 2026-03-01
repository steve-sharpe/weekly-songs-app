import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    await ensureSchema();
    const sql = getSql();

    const rows = (await sql`
      SELECT
        id,
        title,
        track_title,
        artist_name,
        photo_url,
        album_name,
        release_year,
        genre,
        duration_seconds,
        mime_type,
        web_view_link
      FROM tracks
      WHERE is_active = TRUE
      ORDER BY COALESCE(artist_name, ''), COALESCE(track_title, title), id ASC;
    `) as {
      id: number;
      title: string;
      track_title: string | null;
      artist_name: string | null;
      photo_url: string | null;
      album_name: string | null;
      release_year: number | null;
      genre: string | null;
      duration_seconds: number | null;
      mime_type: string;
      web_view_link: string | null;
    }[];

    return NextResponse.json({ tracks: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
