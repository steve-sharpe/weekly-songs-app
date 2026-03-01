import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";

type UpdatePayload = {
  trackTitle?: string | null;
  artistName?: string | null;
  photoUrl?: string | null;
  albumName?: string | null;
  releaseYear?: number | null;
  genre?: string | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ trackId: string }> },
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    const { trackId } = await context.params;
    const parsedTrackId = Number.parseInt(trackId, 10);
    if (!Number.isFinite(parsedTrackId) || parsedTrackId <= 0) {
      return NextResponse.json({ error: "Invalid track id" }, { status: 400 });
    }

    const payload = (await request.json()) as UpdatePayload;

    const hasTrackTitle = Object.prototype.hasOwnProperty.call(payload, "trackTitle");
    const hasArtistName = Object.prototype.hasOwnProperty.call(payload, "artistName");
    const hasPhotoUrl = Object.prototype.hasOwnProperty.call(payload, "photoUrl");
    const hasAlbumName = Object.prototype.hasOwnProperty.call(payload, "albumName");
    const hasReleaseYear = Object.prototype.hasOwnProperty.call(payload, "releaseYear");
    const hasGenre = Object.prototype.hasOwnProperty.call(payload, "genre");

    const rows = (await sql`
      UPDATE tracks
      SET
        track_title = CASE WHEN ${hasTrackTitle} THEN ${payload.trackTitle ?? null} ELSE track_title END,
        artist_name = CASE WHEN ${hasArtistName} THEN ${payload.artistName ?? null} ELSE artist_name END,
        photo_url = CASE WHEN ${hasPhotoUrl} THEN ${payload.photoUrl ?? null} ELSE photo_url END,
        album_name = CASE WHEN ${hasAlbumName} THEN ${payload.albumName ?? null} ELSE album_name END,
        release_year = CASE WHEN ${hasReleaseYear} THEN ${payload.releaseYear ?? null} ELSE release_year END,
        genre = CASE WHEN ${hasGenre} THEN ${payload.genre ?? null} ELSE genre END,
        updated_at = NOW()
      WHERE id = ${parsedTrackId}
      RETURNING id, title, track_title, artist_name, photo_url, album_name, release_year, genre;
    `) as {
      id: number;
      title: string;
      track_title: string | null;
      artist_name: string | null;
      photo_url: string | null;
      album_name: string | null;
      release_year: number | null;
      genre: string | null;
    }[];

    const updated = rows[0];
    if (!updated) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, track: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
