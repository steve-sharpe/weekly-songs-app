"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AdminTrack = {
  id: number;
  title: string;
  track_title: string | null;
  artist_name: string | null;
  photo_url: string | null;
  album_name: string | null;
  release_year: number | null;
  genre: string | null;
  duration_seconds: number | null;
};

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;

function estimateDataUrlSizeBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read image file."));
    };
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process image."));
    image.src = dataUrl;
  });
}

async function compressImageFile(file: File): Promise<string> {
  const original = await fileToDataUrl(file);
  const image = await loadImage(original);

  const largestDimension = Math.max(image.width, image.height);
  const scale = largestDimension > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestDimension : 1;

  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to process image.");
  }

  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.86;
  let compressed = canvas.toDataURL("image/jpeg", quality);

  while (estimateDataUrlSizeBytes(compressed) > MAX_UPLOAD_BYTES && quality > 0.45) {
    quality -= 0.08;
    compressed = canvas.toDataURL("image/jpeg", quality);
  }

  if (estimateDataUrlSizeBytes(compressed) > MAX_UPLOAD_BYTES) {
    throw new Error("Image is still too large after compression. Use a smaller image.");
  }

  return compressed;
}

export default function AdminTracksPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [tickerText, setTickerText] = useState("");
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Record<number, { photoUrl: string }>>({});

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_secret");
    if (saved) {
      setAdminSecret(saved);
    }
  }, []);

  const filteredTracks = useMemo(() => {
    if (!query.trim()) {
      return tracks;
    }

    const lowered = query.toLowerCase();
    return tracks.filter((track) =>
      `${track.track_title ?? track.title} ${track.artist_name ?? ""}`
        .toLowerCase()
        .includes(lowered),
    );
  }, [query, tracks]);

  async function loadTracks(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!adminSecret.trim()) {
        throw new Error("Enter admin secret first.");
      }

      window.localStorage.setItem("admin_secret", adminSecret.trim());

      const response = await fetch("/api/admin/tracks", {
        headers: {
          "x-admin-secret": adminSecret.trim(),
        },
      });

      const body = (await response.json()) as { tracks?: AdminTrack[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Failed to load tracks.");
      }

      const loadedTracks = body.tracks ?? [];
      setTracks(loadedTracks);

      const settingsResponse = await fetch("/api/admin/settings", {
        headers: {
          "x-admin-secret": adminSecret.trim(),
        },
      });

      const settingsBody = (await settingsResponse.json()) as {
        tickerText?: string;
        error?: string;
      };

      if (settingsResponse.ok) {
        setTickerText(settingsBody.tickerText ?? "");
      }

      const initialEditing: Record<number, { photoUrl: string }> = {};
      for (const track of loadedTracks) {
        initialEditing[track.id] = { photoUrl: track.photo_url ?? "" };
      }
      setEditing(initialEditing);
      setMessage(`Loaded ${loadedTracks.length} tracks.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function savePhoto(trackId: number) {
    setMessage("");

    try {
      if (!adminSecret.trim()) {
        throw new Error("Enter admin secret first.");
      }

      const photoUrl = editing[trackId]?.photoUrl?.trim() ?? "";
      const response = await fetch(`/api/admin/tracks/${trackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret.trim(),
        },
        body: JSON.stringify({
          photoUrl: photoUrl || null,
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        track?: AdminTrack;
      };

      if (!response.ok) {
        throw new Error(body.error || "Failed to save photo.");
      }

      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                photo_url: body.track?.photo_url ?? (photoUrl || null),
              }
            : track,
        ),
      );

      setMessage("Photo saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function handleFileUpload(trackId: number, file: File | null) {
    if (!file) {
      return;
    }

    setMessage("");

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Image too large. Keep it under 2MB.");
      }

      const dataUrl = await compressImageFile(file);

      setEditing((prev) => ({
        ...prev,
        [trackId]: {
          photoUrl: dataUrl,
        },
      }));

      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                photo_url: dataUrl,
              }
            : track,
        ),
      );

      setMessage("Image loaded. Click Save Photo to persist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function saveTickerText() {
    setMessage("");

    try {
      if (!adminSecret.trim()) {
        throw new Error("Enter admin secret first.");
      }

      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret.trim(),
        },
        body: JSON.stringify({
          tickerText,
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        tickerText?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "Failed to save ticker text.");
      }

      setTickerText(body.tickerText ?? tickerText);
      setMessage("Ticker text saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function bootstrapProduction() {
    setMessage("");
    setBootstrapping(true);

    try {
      if (!adminSecret.trim()) {
        throw new Error("Enter admin secret first.");
      }

      window.localStorage.setItem("admin_secret", adminSecret.trim());

      const response = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: {
          "x-admin-secret": adminSecret.trim(),
        },
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        sync?: {
          totalFound?: number;
          metadataParsedCount?: number;
          metadataSkippedCount?: number;
        };
        playlist?: {
          tracks?: { id: number }[];
        };
      };

      if (!response.ok) {
        throw new Error(body.error || "Failed to bootstrap production.");
      }

      const totalFound = body.sync?.totalFound ?? 0;
      const parsedCount = body.sync?.metadataParsedCount ?? 0;
      const skippedCount = body.sync?.metadataSkippedCount ?? 0;
      const selected = body.playlist?.tracks?.length ?? 0;

      setMessage(
        `Bootstrap complete. Synced ${totalFound} tracks (${parsedCount} parsed, ${skippedCount} skipped). Weekly playlist has ${selected} track${selected === 1 ? "" : "s"}.`,
      );

      await loadTracks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBootstrapping(false);
    }
  }

  return (
    <div className="comic-bg min-h-screen px-4 py-8 sm:px-8">
      <main className="mx-auto max-w-6xl">
        <section className="paper-panel">
          <h1 className="panel-title">Admin Track Photos</h1>
          <p className="week-meta">Set a photo URL that stays with each track.</p>

          <form onSubmit={loadTracks} className="admin-tools mt-6">
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Admin secret"
              className="admin-input"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search track or artist"
              className="admin-input"
            />
            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? "Loading..." : "Load Tracks"}
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={bootstrapProduction}
              disabled={bootstrapping}
            >
              {bootstrapping ? "Bootstrapping..." : "Bootstrap Production"}
            </button>
          </form>

          {message ? <p className="admin-message mt-4">{message}</p> : null}

          <article className="admin-card mt-6">
            <h2 className="track-title">Ticker Scroll Text</h2>
            <p className="track-meta">This updates the scrolling banner on the home page.</p>
            <textarea
              value={tickerText}
              onChange={(event) => setTickerText(event.target.value)}
              className="admin-textarea"
              rows={3}
            />
            <div className="admin-row">
              <div />
              <button type="button" className="admin-btn" onClick={saveTickerText}>
                Save Scroll Text
              </button>
            </div>
          </article>

          <div className="admin-grid mt-6">
            {filteredTracks.map((track) => (
              <article key={track.id} className="admin-card">
                <div>
                  <h2 className="track-title">{track.track_title ?? track.title}</h2>
                  <p className="track-artist">{track.artist_name ?? "Unknown Artist"}</p>
                </div>

                {track.photo_url ? (
                  <img
                    src={track.photo_url}
                    alt={`${track.track_title ?? track.title} artwork`}
                    className="admin-photo"
                  />
                ) : (
                  <div className="admin-photo admin-photo--empty">NO PHOTO</div>
                )}

                <div className="admin-row">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editing[track.id]?.photoUrl ?? ""}
                    onChange={(event) =>
                      setEditing((prev) => ({
                        ...prev,
                        [track.id]: {
                          photoUrl: event.target.value,
                        },
                      }))
                    }
                    className="admin-input"
                  />
                  <label className="admin-file-label">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="admin-file"
                      onChange={(event) =>
                        handleFileUpload(track.id, event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => savePhoto(track.id)}
                  >
                    Save Photo
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
