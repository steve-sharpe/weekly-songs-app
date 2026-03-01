import { Readable } from "node:stream";
import { existsSync } from "node:fs";
import { google } from "googleapis";
import { parseStream } from "music-metadata";

import { ensureSchema, getSql } from "@/lib/db";

type DriveAudioFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  createdTime: string | null;
};

type ParsedMetadata = {
  trackTitle: string;
  artistName: string;
  albumName: string | null;
  releaseYear: number | null;
  genre: string | null;
  durationSeconds: number | null;
};

type ExistingTrackRow = {
  drive_file_id: string;
  track_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  release_year: number | null;
  genre: string | null;
  duration_seconds: number | null;
};

function extractTrackMetadata(fileName: string): {
  trackTitle: string;
  artistName: string;
} {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "").trim();
  const normalized = withoutExtension.replace(/[_]+/g, " ").replace(/\s+/g, " ");

  const parts = normalized.split(/\s[-–—]\s/);
  if (parts.length >= 2) {
    const artistName = parts[0].trim();
    const trackTitle = parts.slice(1).join(" - ").trim();

    if (artistName && trackTitle) {
      return {
        trackTitle,
        artistName,
      };
    }
  }

  return {
    trackTitle: normalized,
    artistName: "Unknown Artist",
  };
}

function normalizeEmbeddedMetadata(
  fileName: string,
  embedded: {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    genre?: string;
    durationSeconds?: number;
  } | null,
): ParsedMetadata {
  const fromName = extractTrackMetadata(fileName);

  return {
    trackTitle: embedded?.title?.trim() || fromName.trackTitle,
    artistName: embedded?.artist?.trim() || fromName.artistName,
    albumName: embedded?.album?.trim() || null,
    releaseYear: embedded?.year ?? null,
    genre: embedded?.genre?.trim() || null,
    durationSeconds: embedded?.durationSeconds ?? null,
  };
}

async function readEmbeddedMetadata(
  driveFileId: string,
  mimeType: string,
): Promise<{
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  durationSeconds?: number;
} | null> {
  const drive = getDriveClient();

  try {
    const response = await drive.files.get(
      {
        fileId: driveFileId,
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "stream",
      },
    );

    const stream = response.data as unknown as Readable;
    try {
      const metadata = await parseStream(stream, { mimeType }, { duration: true });

      return {
        title: metadata.common.title ?? undefined,
        artist:
          metadata.common.artist ?? metadata.common.artists?.[0] ?? undefined,
        album: metadata.common.album ?? undefined,
        year: metadata.common.year ?? undefined,
        genre: metadata.common.genre?.[0] ?? undefined,
        durationSeconds: metadata.format.duration
          ? Math.round(metadata.format.duration)
          : undefined,
      };
    } finally {
      stream.destroy();
    }
  } catch {
    return null;
  }
}

function getDriveClient() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim();

  if (keyFile && existsSync(keyFile)) {
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    return google.drive({ version: "v3", auth });
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const privateKeyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64;

  if (!clientEmail || (!privateKey && !privateKeyBase64)) {
    throw new Error(
      "Missing Google service account credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64).",
    );
  }

  const rawPrivateKey = privateKeyBase64
    ? Buffer.from(privateKeyBase64.trim(), "base64").toString("utf8")
    : privateKey ?? "";

  const normalizedPrivateKey = rawPrivateKey
    .replace(/\r/g, "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "")
    .replace(/\\\\n/g, "\\n")
    .replace(/\\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail.trim(),
      private_key: normalizedPrivateKey,
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export async function listDriveAudioFiles(): Promise<DriveAudioFile[]> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID environment variable.");
  }

  const drive = getDriveClient();
  const files: DriveAudioFile[] = [];

  let pageToken: string | undefined;
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType contains 'audio/'`,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink, createdTime)",
      pageSize: 1000,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageToken,
    });

    for (const file of response.data.files ?? []) {
      if (!file.id || !file.name || !file.mimeType) {
        continue;
      }

      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink ?? null,
        createdTime: file.createdTime ?? null,
      });
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export async function syncTracksFromDrive() {
  await ensureSchema();
  const sql = getSql();

  const files = await listDriveAudioFiles();
  let metadataParsedCount = 0;
  let metadataSkippedCount = 0;

  const existingRows = (await sql`
    SELECT
      drive_file_id,
      track_title,
      artist_name,
      album_name,
      release_year,
      genre,
      duration_seconds
    FROM tracks;
  `) as ExistingTrackRow[];

  const existingByDriveId = new Map<string, ExistingTrackRow>(
    existingRows.map((row) => [row.drive_file_id, row]),
  );

  for (const file of files) {
    const existing = existingByDriveId.get(file.id);

    const hasCompleteMetadata = Boolean(
      existing?.track_title?.trim() && existing?.artist_name?.trim(),
    );

    const embeddedMetadata = hasCompleteMetadata
      ? null
      : await readEmbeddedMetadata(file.id, file.mimeType);

    if (hasCompleteMetadata) {
      metadataSkippedCount += 1;
    } else {
      metadataParsedCount += 1;
    }

    const normalizedFromFile = normalizeEmbeddedMetadata(file.name, embeddedMetadata);

    const metadata: ParsedMetadata = {
      trackTitle: existing?.track_title?.trim() || normalizedFromFile.trackTitle,
      artistName: existing?.artist_name?.trim() || normalizedFromFile.artistName,
      albumName: existing?.album_name ?? normalizedFromFile.albumName,
      releaseYear: existing?.release_year ?? normalizedFromFile.releaseYear,
      genre: existing?.genre ?? normalizedFromFile.genre,
      durationSeconds:
        existing?.duration_seconds ?? normalizedFromFile.durationSeconds,
    };

    await sql`
      INSERT INTO tracks (
        drive_file_id,
        title,
        track_title,
        artist_name,
        album_name,
        release_year,
        genre,
        duration_seconds,
        mime_type,
        web_view_link,
        created_time,
        is_active,
        updated_at
      )
      VALUES (
        ${file.id},
        ${file.name},
        ${metadata.trackTitle},
        ${metadata.artistName},
        ${metadata.albumName},
        ${metadata.releaseYear},
        ${metadata.genre},
        ${metadata.durationSeconds},
        ${file.mimeType},
        ${file.webViewLink},
        ${file.createdTime ? new Date(file.createdTime).toISOString() : null},
        TRUE,
        NOW()
      )
      ON CONFLICT (drive_file_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        track_title = EXCLUDED.track_title,
        artist_name = EXCLUDED.artist_name,
        album_name = EXCLUDED.album_name,
        release_year = EXCLUDED.release_year,
        genre = EXCLUDED.genre,
        duration_seconds = EXCLUDED.duration_seconds,
        mime_type = EXCLUDED.mime_type,
        web_view_link = EXCLUDED.web_view_link,
        created_time = EXCLUDED.created_time,
        is_active = TRUE,
        updated_at = NOW();
    `;
  }

  return {
    totalFound: files.length,
    metadataParsedCount,
    metadataSkippedCount,
    syncedAt: new Date().toISOString(),
  };
}

export async function streamDriveFileById(
  driveFileId: string,
  range?: string,
) {
  const drive = getDriveClient();

  const requestConfig = {
    fileId: driveFileId,
    alt: "media" as const,
    supportsAllDrives: true,
  };

  const response = await (async () => {
    if (!range) {
      return drive.files.get(requestConfig, {
        responseType: "stream",
      });
    }

    try {
      return await drive.files.get(requestConfig, {
        responseType: "stream",
        headers: { Range: range },
      });
    } catch {
      return drive.files.get(requestConfig, {
        responseType: "stream",
      });
    }
  })();

  return {
    stream: response.data as unknown as Readable,
    status: response.status ?? 200,
    contentType:
      (response.headers["content-type"] as string | undefined) ??
      "audio/mpeg",
    contentLength: response.headers["content-length"] as string | undefined,
    contentRange: response.headers["content-range"] as string | undefined,
    acceptRanges: response.headers["accept-ranges"] as string | undefined,
  };
}
