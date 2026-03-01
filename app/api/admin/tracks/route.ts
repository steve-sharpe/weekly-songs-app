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
        t.id,
        t.title,
        t.track_title,
        t.artist_name,
        t.photo_url,
        t.album_name,
        t.release_year,
        t.genre,
        t.duration_seconds,
        t.mime_type,
        t.web_view_link,
        COUNT(wpt.id)::int AS featured_count
      FROM tracks t
      LEFT JOIN weekly_playlist_tracks wpt ON wpt.track_id = t.id
      WHERE t.is_active = TRUE
      GROUP BY
        t.id,
        t.title,
        t.track_title,
        t.artist_name,
        t.photo_url,
        t.album_name,
        t.release_year,
        t.genre,
        t.duration_seconds,
        t.mime_type,
        t.web_view_link
      ORDER BY COALESCE(t.artist_name, ''), COALESCE(t.track_title, t.title), t.id ASC;
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
      featured_count: number;
    }[];

    return NextResponse.json({ tracks: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
