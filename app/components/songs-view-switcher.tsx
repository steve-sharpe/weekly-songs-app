"use client";

import { useMemo, useRef, useState } from "react";

import PlaylistCards from "@/app/components/playlist-cards";
import type { PlaylistTrack } from "@/lib/types";

type SongsViewSwitcherProps = {
  tracks: PlaylistTrack[];
};

type ViewMode = "cards" | "compact";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function SongsViewSwitcher({ tracks }: SongsViewSwitcherProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerMessage, setPlayerMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasTracks = useMemo(() => tracks.length > 0, [tracks.length]);
  const activeTrack = activeIndex !== null ? tracks[activeIndex] : null;

  async function playCurrentTrack() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
      setPlayerMessage("");
    } catch {
      setIsPlaying(false);
      setPlayerMessage("Track could not be played.");
    }
  }

  async function selectTrack(index: number, shouldPlay = true) {
    if (!hasTracks || index < 0 || index >= tracks.length) {
      return;
    }

    setActiveIndex(index);
    setIsPlaying(false);
    setPlayerMessage("");

    if (!shouldPlay) {
      return;
    }

    setTimeout(() => {
      void playCurrentTrack();
    }, 0);
  }

  async function handlePlayPause() {
    if (!hasTracks) {
      return;
    }

    if (activeIndex === null) {
      await selectTrack(0, true);
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      await playCurrentTrack();
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  async function handleNext() {
    if (!hasTracks) {
      return;
    }

    const nextIndex = activeIndex === null ? 0 : Math.min(activeIndex + 1, tracks.length - 1);
    await selectTrack(nextIndex, true);
  }

  async function handleShuffle() {
    if (!hasTracks) {
      return;
    }

    if (tracks.length === 1) {
      await selectTrack(0, true);
      return;
    }

    let randomIndex = Math.floor(Math.random() * tracks.length);
    if (activeIndex !== null && randomIndex === activeIndex) {
      randomIndex = (randomIndex + 1) % tracks.length;
    }

    await selectTrack(randomIndex, true);
  }

  async function handlePrevious() {
    if (!hasTracks) {
      return;
    }

    const previousIndex = activeIndex === null ? 0 : Math.max(activeIndex - 1, 0);
    await selectTrack(previousIndex, true);
  }

  return (
    <div>
      <div className="songs-view-toggle-row">
        <button
          type="button"
          className={`play-all-btn ${viewMode === "cards" ? "songs-view-toggle-btn--active" : "play-all-btn--secondary"}`}
          onClick={() => {
            setViewMode("cards");
          }}
        >
          Card View
        </button>
        <button
          type="button"
          className={`play-all-btn ${viewMode === "compact" ? "songs-view-toggle-btn--active" : "play-all-btn--secondary"}`}
          onClick={() => {
            setViewMode("compact");
          }}
        >
          Compact View
        </button>
      </div>

      {viewMode === "cards" ? (
        <>
          <div className="weekly-subtitle-row">
            <p className="weekly-subtitle">Select image to play</p>
          </div>
          <PlaylistCards tracks={tracks} />
        </>
      ) : (
        <div className="compact-player-shell mt-5">
          <div className="compact-player-controls">
            <p className="compact-player-now">
              {activeTrack ? `${activeTrack.trackTitle} — ${activeTrack.artistName}` : "Select a track to start"}
            </p>
            <div className="compact-player-buttons">
              <button type="button" className="play-all-btn play-all-btn--secondary" onClick={() => void handlePrevious()} disabled={!hasTracks}>
                ⏮
              </button>
              <button type="button" className="play-all-btn" onClick={() => void handlePlayPause()} disabled={!hasTracks}>
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button type="button" className="play-all-btn compact-shuffle-btn" onClick={() => void handleShuffle()} disabled={!hasTracks}>
                🔀
              </button>
              <button type="button" className="play-all-btn play-all-btn--secondary" onClick={() => void handleNext()} disabled={!hasTracks}>
                ⏭
              </button>
            </div>
            {playerMessage ? <p className="admin-message">{playerMessage}</p> : null}
          </div>

          <ol className="compact-playlist">
            {tracks.map((track, index) => (
              <li key={track.id}>
                <button
                  type="button"
                  className={`compact-track-btn ${activeIndex === index ? "compact-track-btn--active" : ""}`}
                  onClick={() => {
                    void selectTrack(index, true);
                  }}
                >
                  <span className="compact-track-name">{track.trackTitle}</span>
                  <span className="compact-track-meta">
                    {track.artistName} • {formatDuration(track.durationSeconds)}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <audio
            ref={audioRef}
            preload="none"
            src={activeTrack?.streamUrl ?? undefined}
            onPlay={() => {
              setIsPlaying(true);
            }}
            onPause={() => {
              setIsPlaying(false);
            }}
            onEnded={() => {
              void handleNext();
            }}
            onError={() => {
              setPlayerMessage("This track could not be loaded.");
              setIsPlaying(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
