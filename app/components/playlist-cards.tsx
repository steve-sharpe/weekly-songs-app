"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { PlaylistTrack } from "@/lib/types";

type PlaylistCardsProps = {
  tracks: PlaylistTrack[];
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function PlaylistCards({ tracks }: PlaylistCardsProps) {
  const audioRefs = useRef<Array<HTMLAudioElement | null>>([]);
  const autoStartDoneRef = useRef(false);
  const [isPlayAllActive, setIsPlayAllActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playerMessage, setPlayerMessage] = useState("");

  const hasTracks = useMemo(() => tracks.length > 0, [tracks.length]);
  const nowPlayingTrack = activeIndex !== null ? tracks[activeIndex] : null;

  function stopAllTracks() {
    for (const audio of audioRefs.current) {
      if (!audio) {
        continue;
      }

      audio.pause();
      audio.currentTime = 0;
    }

    setIsPlayAllActive(false);
    setActiveIndex(null);
  }

  function pauseAllTracks(resetCurrentTime: boolean) {
    for (const audio of audioRefs.current) {
      if (!audio) {
        continue;
      }

      audio.pause();
      if (resetCurrentTime) {
        audio.currentTime = 0;
      }
    }
  }

  async function playTrackAt(index: number) {
    const audio = audioRefs.current[index];
    if (!audio) {
      return;
    }

    try {
      setPlayerMessage("");
      await audio.play();
      setActiveIndex(index);
    } catch {
      setPlayerMessage("Track could not be played. Trying next available track.");
      setIsPlayAllActive(false);
      setActiveIndex(null);
    }
  }

  async function handlePlay() {
    if (!hasTracks) {
      return;
    }

    setIsPlayAllActive(true);

    if (activeIndex !== null) {
      pauseAllTracks(false);
      await playTrackAt(activeIndex);
      return;
    }

    stopAllTracks();
    await playTrackAt(0);
  }

  async function handleNextTrack() {
    if (!hasTracks) {
      return;
    }

    const nextIndex =
      activeIndex === null ? 0 : Math.min(activeIndex + 1, tracks.length - 1);

    setIsPlayAllActive(false);
    pauseAllTracks(true);
    await playTrackAt(nextIndex);
  }

  async function handleLastTrack() {
    if (!hasTracks) {
      return;
    }

    const previousIndex =
      activeIndex === null ? 0 : Math.max(activeIndex - 1, 0);

    setIsPlayAllActive(false);
    pauseAllTracks(true);
    await playTrackAt(previousIndex);
  }

  async function handleSelectTrack(index: number) {
    if (!hasTracks) {
      return;
    }

    setIsPlayAllActive(false);
    pauseAllTracks(true);
    await playTrackAt(index);
  }

  async function handleTrackEnded(index: number) {
    const nextIndex = index + 1;
    if (nextIndex >= tracks.length) {
      setIsPlayAllActive(false);
      setActiveIndex(null);
      return;
    }

    await playTrackAt(nextIndex);
  }

  async function handleTrackError(index: number) {
    if (!isPlayAllActive) {
      setActiveIndex(null);
      setPlayerMessage("This track could not be loaded.");
      return;
    }

    const nextIndex = index + 1;
    if (nextIndex >= tracks.length) {
      setIsPlayAllActive(false);
      setActiveIndex(null);
      setPlayerMessage("Some tracks failed to load.");
      return;
    }

    await playTrackAt(nextIndex);
  }

  useEffect(() => {
    if (!hasTracks || autoStartDoneRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (autoStartDoneRef.current) {
        return;
      }

      autoStartDoneRef.current = true;
      if (activeIndex === null) {
        void handleSelectTrack(0);
      }
    }, 10_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasTracks, activeIndex]);

  return (
    <div className="playlist-shell">

      {playerMessage ? <p className="admin-message mt-3">{playerMessage}</p> : null}

      <div className="track-grid mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {tracks.map((track, index) => (
          <article
            key={track.id}
            className={`track-card ${activeIndex === index ? "track-card--active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              void handleSelectTrack(index);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void handleSelectTrack(index);
              }
            }}
          >
            {track.photoUrl ? (
              <img
                src={track.photoUrl}
                alt={`${track.trackTitle} artwork`}
                className="track-bg-image"
              />
            ) : null}

            <div className="track-overlay">
              <h3 className="track-title">{track.trackTitle}</h3>
              <p className="track-artist">{track.artistName}</p>
              <p className="track-meta">
                {track.albumName ? `${track.albumName}` : "Single"}
                {track.genre ? ` • ${track.genre}` : ""}
                {` • ${formatDuration(track.durationSeconds)}`}
              </p>
              <audio
                preload="none"
                src={track.streamUrl}
                className="track-player w-full"
                ref={(element) => {
                  audioRefs.current[index] = element;
                }}
                onPlay={() => {
                  setActiveIndex(index);
                  setPlayerMessage("");
                }}
                onEnded={() => {
                  void handleTrackEnded(index);
                }}
                onError={() => {
                  void handleTrackError(index);
                }}
              >
                Your browser does not support audio playback.
              </audio>
            </div>
          </article>
        ))}
      </div>

      <div className="now-playing-bar" role="region" aria-label="Now playing controls">
        <div className="now-playing-meta">
          <p className="now-playing-label">Now Playing</p>
          <p className="now-playing-title">
            {nowPlayingTrack ? nowPlayingTrack.trackTitle : "Not Playing"}
          </p>
          <p className="now-playing-artist">
            {nowPlayingTrack ? nowPlayingTrack.artistName : "Select Play to start"}
          </p>
        </div>

        <div className="now-playing-controls">
          <button
            type="button"
            className="play-all-btn play-all-btn--secondary now-playing-btn"
            onClick={() => {
              void handleLastTrack();
            }}
            disabled={!hasTracks}
            aria-label="Previous track"
            title="Previous track"
          >
            ⏮
          </button>
          <button
            type="button"
            className="play-all-btn now-playing-btn"
            onClick={() => {
              void handlePlay();
            }}
            disabled={!hasTracks}
            aria-label="Play"
            title="Play"
          >
            ▶
          </button>
          <button
            type="button"
            className="play-all-btn play-all-btn--secondary now-playing-btn"
            onClick={() => {
              void handleNextTrack();
            }}
            disabled={!hasTracks}
            aria-label="Next track"
            title="Next track"
          >
            ⏭
          </button>
          <button
            type="button"
            className="play-all-btn play-all-btn--secondary now-playing-btn"
            onClick={stopAllTracks}
            disabled={!isPlayAllActive && activeIndex === null}
            aria-label="Stop"
            title="Stop"
          >
            ■
          </button>
        </div>
      </div>
    </div>
  );
}
