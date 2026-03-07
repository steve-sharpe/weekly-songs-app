"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type GamePlayer = {
  name: string;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  potions: number;
  turnsLeft: number;
};

type GameAction = "fight" | "rest" | "buy_potion" | "use_potion";

const PLAYER_STORAGE_KEY = "hulk_rpg_player_name";

export default function GamePage() {
  const [nameInput, setNameInput] = useState("");
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [logLines, setLogLines] = useState<string[]>([
    "Welcome to Neon Alley. Create your character to begin.",
  ]);

  const xpToNext = useMemo(() => {
    if (!player) {
      return 0;
    }

    return 30 + (player.level - 1) * 20;
  }, [player]);

  useEffect(() => {
    const savedName = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!savedName) {
      return;
    }

    setNameInput(savedName);
    void loadPlayer(savedName);
  }, []);

  async function loadPlayer(name: string) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/game/player?name=${encodeURIComponent(name)}`);
      const body = (await response.json()) as { player?: GamePlayer; error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Failed to load player.");
      }

      if (!body.player) {
        throw new Error("Player data missing.");
      }

      setPlayer(body.player);
      setLogLines((prev) => [`Welcome back, ${body.player?.name}.`, ...prev].slice(0, 8));
    } catch {
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  }

  async function createOrLoadPlayer(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/game/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });

      const body = (await response.json()) as { player?: GamePlayer; error?: string };

      if (!response.ok || !body.player) {
        throw new Error(body.error || "Could not create player.");
      }

      setPlayer(body.player);
      window.localStorage.setItem(PLAYER_STORAGE_KEY, body.player.name);
      setNameInput(body.player.name);
      setLogLines([
        `Character ready: ${body.player.name} (Level ${body.player.level})`,
        "You have 5 turns per day. Use them wisely.",
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: GameAction) {
    if (!player) {
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: player.name, action }),
      });

      const body = (await response.json()) as {
        player?: GamePlayer;
        lines?: string[];
        error?: string;
      };

      if (!response.ok || !body.player) {
        throw new Error(body.error || "Action failed.");
      }

      setPlayer(body.player);
      const lines = body.lines ?? [];
      if (lines.length) {
        setLogLines((prev) => [...lines, ...prev].slice(0, 14));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="comic-bg min-h-screen px-4 py-8 text-black sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <a href="/" className="weekly-back-btn inline-block">
          ← Go Back Home
        </a>

        <section className="paper-panel mt-4 space-y-6 p-5 sm:p-8">
          <div className="space-y-2 text-center">
            <h1 className="weekly-panel-title">Neon Alley Quest</h1>
            <p className="weekly-subtitle">A daily-turn retro text RPG inspired by classics</p>
          </div>

          <form onSubmit={createOrLoadPlayer} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              className="rounded border-2 border-black bg-white px-3 py-2 text-base"
              placeholder="Enter character name"
              maxLength={24}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded border-2 border-black bg-yellow-300 px-4 py-2 font-bold uppercase shadow-[4px_4px_0_#000] disabled:opacity-60"
            >
              {loading ? "Loading..." : "Create / Load"}
            </button>
          </form>

          {message ? <p className="admin-message">{message}</p> : null}

          {player ? (
            <>
              <div className="grid grid-cols-2 gap-3 rounded border-2 border-black bg-white p-4 text-sm sm:grid-cols-5 sm:text-base">
                <p><strong>Name:</strong> {player.name}</p>
                <p><strong>Level:</strong> {player.level}</p>
                <p><strong>HP:</strong> {player.hp}/{player.maxHp}</p>
                <p><strong>Gold:</strong> {player.gold}</p>
                <p><strong>Turns:</strong> {player.turnsLeft}</p>
                <p><strong>ATK:</strong> {player.attack}</p>
                <p><strong>DEF:</strong> {player.defense}</p>
                <p><strong>Potions:</strong> {player.potions}</p>
                <p><strong>XP:</strong> {player.xp}/{xpToNext}</p>
                <p><strong>Reset:</strong> Daily UTC</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => void runAction("fight")}
                  disabled={actionLoading}
                  className="rounded border-2 border-black bg-red-400 px-3 py-2 font-bold uppercase shadow-[4px_4px_0_#000] disabled:opacity-60"
                >
                  Fight
                </button>
                <button
                  type="button"
                  onClick={() => void runAction("rest")}
                  disabled={actionLoading}
                  className="rounded border-2 border-black bg-blue-300 px-3 py-2 font-bold uppercase shadow-[4px_4px_0_#000] disabled:opacity-60"
                >
                  Rest
                </button>
                <button
                  type="button"
                  onClick={() => void runAction("buy_potion")}
                  disabled={actionLoading}
                  className="rounded border-2 border-black bg-green-300 px-3 py-2 font-bold uppercase shadow-[4px_4px_0_#000] disabled:opacity-60"
                >
                  Buy Potion
                </button>
                <button
                  type="button"
                  onClick={() => void runAction("use_potion")}
                  disabled={actionLoading}
                  className="rounded border-2 border-black bg-purple-300 px-3 py-2 font-bold uppercase shadow-[4px_4px_0_#000] disabled:opacity-60"
                >
                  Use Potion
                </button>
              </div>
            </>
          ) : null}

          <div className="rounded border-2 border-black bg-black p-4 text-left text-sm text-lime-300 sm:text-base">
            <p className="mb-2 font-bold uppercase text-yellow-300">Adventure Log</p>
            <ul className="space-y-1">
              {logLines.map((line, index) => (
                <li key={`${line}-${index}`}>• {line}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
