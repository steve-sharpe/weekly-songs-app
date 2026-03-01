"use client";

import { useMemo, useRef, useState } from "react";

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
  const [isPlayAllActive, setIsPlayAllActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const hasTracks = useMemo(() => tracks.length > 0, [tracks.length]);

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
      await audio.play();
      setActiveIndex(index);
    } catch {
      setIsPlayAllActive(false);
      setActiveIndex(null);
    }
  }

  async function handlePlayAll() {
    if (!hasTracks) {
      return;
    }

    stopAllTracks();
    setIsPlayAllActive(true);
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

  async function handleTrackEnded(index: number) {
    if (!isPlayAllActive) {
      return;
    }

    const nextIndex = index + 1;
    if (nextIndex >= tracks.length) {
      setIsPlayAllActive(false);
      setActiveIndex(null);
      return;
    }

    await playTrackAt(nextIndex);
  }

  return (
    <>
      <div className="play-all-row mt-6">
        <button
          type="button"
          className="play-all-btn play-all-btn--secondary"
          onClick={() => {
            void handleLastTrack();
          }}
          disabled={!hasTracks}
        >
          ⏮ Last Track
        </button>
        <button
          type="button"
          className="play-all-btn"
          onClick={handlePlayAll}
          disabled={!hasTracks}
        >
          ▶ Play All
        </button>
        <button
          type="button"
          className="play-all-btn play-all-btn--secondary"
          onClick={() => {
            void handleNextTrack();
          }}
          disabled={!hasTracks}
        >
          ⏭ Next Track
        </button>
        <button
          type="button"
          className="play-all-btn play-all-btn--secondary"
          onClick={stopAllTracks}
          disabled={!isPlayAllActive && activeIndex === null}
        >
          ■ Stop
        </button>
      </div>

      <div className="track-grid mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {tracks.map((track, index) => (
          <article
            key={track.id}
            className={`track-card ${activeIndex === index ? "track-card--active" : ""}`}
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
                controls
                preload="none"
                className="track-player w-full"
                ref={(element) => {
                  audioRefs.current[index] = element;
                }}
                onEnded={() => {
                  void handleTrackEnded(index);
                }}
              >
                <source src={track.streamUrl} type={track.mimeType} />
                Your browser does not support audio playback.
              </audio>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
