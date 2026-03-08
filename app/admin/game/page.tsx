"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type GameRivalDesign = {
  id: string;
  stageName: string;
  hometown: string;
  genre: string;
  signatureMove: string;
  attack: number;
  defense: number;
  stamina: number;
  xpReward: number;
  goldReward: number;
  enabled: boolean;
};

type BookingBandDesign = {
  id: string;
  stageName: string;
  genre: string;
  photoUrl: string;
  draw: number;
  fee: number;
  reliability: number;
  crowdEnergy: number;
  enabled: boolean;
};

type BookingVenueDesign = {
  id: string;
  name: string;
  photoUrl: string;
  capacity: number;
  baseRent: number;
  prestige: number;
  genreAffinity: Record<string, number>;
  enabled: boolean;
};

type BookingPromoPackage = {
  id: string;
  label: string;
  cost: number;
  attendanceBoost: number;
};

type SceneEventDesign = {
  id: string;
  label: string;
  chance: number;
  moneyDelta: number;
  fameDelta: number;
  sceneCredDelta: number;
  fanTrustDelta: number;
  enabled: boolean;
};

type FeaturedGuestBonusSettings = {
  enabled: boolean;
  moneyBonus: number;
  fameBonus: number;
  sceneCredBonus: number;
  fanTrustBonus: number;
};

type SeasonSettings = {
  weeksPerSeason: number;
  daysPerWeek: number;
  winThresholdFame: number;
  winThresholdSceneCred: number;
  winThresholdFanTrust: number;
};

type SimulateNightResult = {
  showResult: {
    venueName: string;
    attendance: number;
    capacity: number;
    revenue: number;
    costs: number;
    profit: number;
    featuredGuestName: string | null;
    featuredGuestHit: boolean;
  };
  lines: string[];
  featuredGuestOfWeek: string | null;
};

type GameDesignConfig = {
  cityName: string;
  titleGoal: string;
  introLine: string;
  jamOffLine: string;
  rivals: GameRivalDesign[];
  bands: BookingBandDesign[];
  venues: BookingVenueDesign[];
  promoPackages: BookingPromoPackage[];
  sceneEvents: SceneEventDesign[];
  featuredGuestBonus: FeaturedGuestBonusSettings;
  seasonSettings: SeasonSettings;
};

type MusicalGuestSuggestion = {
  artistName: string;
  trackCount: number;
};

type AutoSaveState = "idle" | "pending" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 900;
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const OUTPUT_IMAGE_TYPE = "image/webp";
const OUTPUT_IMAGE_QUALITY = 0.82;

const FALLBACK_DESIGN: GameDesignConfig = {
  cityName: "St. John's",
  titleGoal: "Biggest Rock Star in St. John's",
  introLine: "George Street is buzzing tonight. Build your legend through local bookings.",
  jamOffLine: "Each show is a battle for turnout, scene cred, and headline status.",
  rivals: [],
  bands: [],
  venues: [],
  promoPackages: [
    { id: "posters", label: "Posters", cost: 10, attendanceBoost: 0.06 },
    { id: "social-boost", label: "Social Boost", cost: 20, attendanceBoost: 0.12 },
  ],
  sceneEvents: [
    {
      id: "local-blogger-hype",
      label: "A local blogger hypes your lineup before doors open.",
      chance: 0.16,
      moneyDelta: 0,
      fameDelta: 2,
      sceneCredDelta: 0,
      fanTrustDelta: 0,
      enabled: true,
    },
    {
      id: "stormy-weather",
      label: "Stormy weather keeps some fans at home.",
      chance: 0.12,
      moneyDelta: -15,
      fameDelta: 0,
      sceneCredDelta: 0,
      fanTrustDelta: -1,
      enabled: true,
    },
  ],
  featuredGuestBonus: {
    enabled: true,
    moneyBonus: 20,
    fameBonus: 2,
    sceneCredBonus: 2,
    fanTrustBonus: 1,
  },
  seasonSettings: {
    weeksPerSeason: 4,
    daysPerWeek: 5,
    winThresholdFame: 90,
    winThresholdSceneCred: 25,
    winThresholdFanTrust: 55,
  },
};

const INVALID_INPUT_CLASS = "border-red-600 ring-1 ring-red-500";

function toSlug(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return slug || fallback;
}

function toRivalId(stageName: string, index: number): string {
  return toSlug(stageName, `rival-${index + 1}`);
}

function toUniqueSlug(baseValue: string, fallback: string, existingIds: string[]): string {
  const baseSlug = toSlug(baseValue, fallback);

  if (!existingIds.includes(baseSlug)) {
    return baseSlug;
  }

  let count = 2;
  while (existingIds.includes(`${baseSlug}-${count}`)) {
    count += 1;
  }

  return `${baseSlug}-${count}`;
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);

  if (moved === undefined) {
    return items;
  }

  next.splice(toIndex, 0, moved);
  return next;
}

function createRivalFromGuest(artistName: string, index: number): GameRivalDesign {
  return {
    id: toRivalId(artistName, index),
    stageName: artistName,
    hometown: "St. John's",
    genre: "Rock",
    signatureMove: "Crowd Surge",
    attack: 8,
    defense: 5,
    stamina: 28,
    xpReward: 14,
    goldReward: 10,
    enabled: true,
  };
}

function createEmptyRival(index: number): GameRivalDesign {
  return {
    id: `rival-${index + 1}`,
    stageName: "",
    hometown: "St. John's",
    genre: "Rock",
    signatureMove: "Amp Surge",
    attack: 8,
    defense: 5,
    stamina: 28,
    xpReward: 14,
    goldReward: 10,
    enabled: true,
  };
}

function createBandFromRival(rival: GameRivalDesign, index: number): BookingBandDesign {
  return {
    id: rival.id || `band-${index + 1}`,
    stageName: rival.stageName || `Band ${index + 1}`,
    genre: rival.genre || "Rock",
    photoUrl: "",
    draw: Math.max(20, Math.min(220, 20 + rival.attack * 6 + rival.defense * 2)),
    fee: Math.max(10, Math.min(400, 20 + rival.xpReward * 2)),
    reliability: Math.max(40, Math.min(99, 58 + rival.defense * 4)),
    crowdEnergy: Math.max(20, Math.min(100, 45 + rival.attack * 4)),
    enabled: rival.enabled,
  };
}

function createEmptyBand(index: number): BookingBandDesign {
  return {
    id: `band-${index + 1}`,
    stageName: `Band ${index + 1}`,
    genre: "Rock",
    photoUrl: "",
    draw: 60,
    fee: 70,
    reliability: 72,
    crowdEnergy: 65,
    enabled: true,
  };
}

function createEmptyVenue(index: number): BookingVenueDesign {
  return {
    id: `venue-${index + 1}`,
    name: `Venue ${index + 1}`,
    photoUrl: "",
    capacity: 180,
    baseRent: 80,
    prestige: 2,
    genreAffinity: { rock: 0.1 },
    enabled: true,
  };
}

function createEmptyPromo(index: number): BookingPromoPackage {
  return {
    id: `promo-${index + 1}`,
    label: `Promo ${index + 1}`,
    cost: 20,
    attendanceBoost: 0.1,
  };
}

function formatGenreAffinity(value: Record<string, number>): string {
  return Object.entries(value)
    .map(([key, amount]) => `${key}:${amount}`)
    .join(", ");
}

function parseGenreAffinity(value: string): Record<string, number> {
  const entries = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rawKey, rawAmount] = part.split(":").map((segment) => segment.trim());
      const parsed = Number(rawAmount);

      if (!rawKey || !Number.isFinite(parsed)) {
        return null;
      }

      return [rawKey.toLowerCase(), parsed] as const;
    })
    .filter((entry): entry is readonly [string, number] => entry !== null);

  return Object.fromEntries(entries);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function toCsvCell(value: string | number | boolean): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function toNumberError(value: number, min: number, max: number, label: string): string | null {
  if (!Number.isFinite(value)) {
    return `${label} must be a valid number.`;
  }

  if (value < min || value > max) {
    return `${label} must be between ${min} and ${max}.`;
  }

  return null;
}

function toImageBackground(photoUrl: string): string {
  return `url("${photoUrl.replace(/"/g, "\\\"")}")`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Could not read the selected image."));
        return;
      }

      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to process the selected image."));
    image.src = dataUrl;
  });
}

async function optimizeImageDataUrl(dataUrl: string): Promise<string> {
  const image = await loadImageFromDataUrl(dataUrl);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const longestSide = Math.max(sourceWidth, sourceHeight, 1);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  const optimized = canvas.toDataURL(OUTPUT_IMAGE_TYPE, OUTPUT_IMAGE_QUALITY);

  return optimized || dataUrl;
}

async function readImageAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file.");
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image is too large. Keep file size under 5MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  try {
    return await optimizeImageDataUrl(dataUrl);
  } catch {
    return dataUrl;
  }
}

function toUploadSuccessMessage(target: "Band" | "Venue"): string {
  return `${target} photo uploaded and optimized. Save or wait for autosave to persist.`;
}

function toUploadErrorMessage(target: "band" | "venue"): string {
  return `Failed to upload ${target} photo.`;
}

export default function GameAdminDesignerPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");
  const [hasLoadedDesign, setHasLoadedDesign] = useState(false);
  const [message, setMessage] = useState("");
  const [design, setDesign] = useState<GameDesignConfig>(FALLBACK_DESIGN);
  const [guestSuggestions, setGuestSuggestions] = useState<MusicalGuestSuggestion[]>([]);
  const [simVenueId, setSimVenueId] = useState("");
  const [simBandIds, setSimBandIds] = useState<string[]>([]);
  const [simPromoIds, setSimPromoIds] = useState<string[]>([]);
  const [simWeek, setSimWeek] = useState(1);
  const [simDay, setSimDay] = useState(1);
  const [simResult, setSimResult] = useState<SimulateNightResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [resettingPlayers, setResettingPlayers] = useState(false);
  const [resettingDesign, setResettingDesign] = useState(false);
  const [resettingLineup, setResettingLineup] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDesignRef = useRef<string>(JSON.stringify(FALLBACK_DESIGN));
  const bandCsvInputRef = useRef<HTMLInputElement | null>(null);
  const venueCsvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_secret");
    if (saved) {
      setAdminSecret(saved);
    }
  }, []);

  const activeRivalCount = useMemo(
    () => design.rivals.filter((rival) => rival.enabled).length,
    [design.rivals],
  );

  const activeBandCount = useMemo(
    () => design.bands.filter((band) => band.enabled).length,
    [design.bands],
  );

  const activeVenueCount = useMemo(
    () => design.venues.filter((venue) => venue.enabled).length,
    [design.venues],
  );

  const designSnapshot = useMemo(() => JSON.stringify(design), [design]);

  const autoSaveStatusLabel = useMemo(() => {
    switch (autoSaveState) {
      case "pending":
        return "Pending changes";
      case "saving":
        return "Saving...";
      case "saved":
        return "All changes saved";
      case "error":
        return "Autosave failed";
      default:
        return "Idle";
    }
  }, [autoSaveState]);

  const saveDesignRequest = useCallback(async (
    nextDesign: GameDesignConfig,
    secret: string,
  ): Promise<GameDesignConfig> => {
    const response = await fetch("/api/admin/game/design", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
      },
      body: JSON.stringify({
        design: nextDesign,
      }),
    });

    const body = (await response.json()) as {
      ok?: boolean;
      design?: GameDesignConfig;
      error?: string;
    };

    if (!response.ok || !body.design) {
      throw new Error(body.error || "Failed to save game design.");
    }

    return body.design;
  }, []);

  async function loadDesign(event?: FormEvent) {
    event?.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const secret = adminSecret.trim();
      if (!secret) {
        throw new Error("Enter admin secret first.");
      }

      window.localStorage.setItem("admin_secret", secret);

      const response = await fetch("/api/admin/game/design", {
        headers: {
          "x-admin-secret": secret,
        },
      });

      const body = (await response.json()) as {
        design?: GameDesignConfig;
        guestSuggestions?: MusicalGuestSuggestion[];
        error?: string;
      };

      if (!response.ok || !body.design) {
        throw new Error(body.error || "Failed to load game design.");
      }

      setDesign(body.design);
      setGuestSuggestions(body.guestSuggestions ?? []);
      lastSavedDesignRef.current = JSON.stringify(body.design);
      setHasLoadedDesign(true);
      setAutoSaveState("saved");
      setMessage("Game design loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
      setAutoSaveState("error");
    } finally {
      setLoading(false);
    }
  }

  const saveDesign = useCallback(async () => {
    setMessage("");
    setSaving(true);

    try {
      const secret = adminSecret.trim();
      if (!secret) {
        throw new Error("Enter admin secret first.");
      }

      window.localStorage.setItem("admin_secret", secret);

      const savedDesign = await saveDesignRequest(design, secret);

      setDesign(savedDesign);
      lastSavedDesignRef.current = JSON.stringify(savedDesign);
      setHasLoadedDesign(true);
      setAutoSaveState("saved");
      setMessage("Game design saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
      setAutoSaveState("error");
    } finally {
      setSaving(false);
    }
  }, [adminSecret, design, saveDesignRequest]);

  useEffect(() => {
    if (!autoSaveEnabled || !hasLoadedDesign || loading || saving) {
      return;
    }

    const secret = adminSecret.trim();
    if (!secret) {
      setAutoSaveState("idle");
      return;
    }

    if (designSnapshot === lastSavedDesignRef.current) {
      setAutoSaveState("saved");
      return;
    }

    setAutoSaveState("pending");

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const snapshotToSave = designSnapshot;

    autoSaveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          setAutoSaveState("saving");
          const parsedDesign = JSON.parse(snapshotToSave) as GameDesignConfig;
          const savedDesign = await saveDesignRequest(parsedDesign, secret);
          const savedSnapshot = JSON.stringify(savedDesign);

          lastSavedDesignRef.current = savedSnapshot;
          if (savedSnapshot !== snapshotToSave) {
            setDesign(savedDesign);
          }
          setAutoSaveState("saved");
        } catch (error) {
          setAutoSaveState("error");
          const messageText =
            error instanceof Error ? error.message : "Unknown error while autosaving.";
          setMessage(`Autosave failed: ${messageText}`);
        }
      })();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSaveEnabled, hasLoadedDesign, loading, saving, adminSecret, designSnapshot, saveDesignRequest]);

  function updateTopLevelField<K extends keyof Omit<GameDesignConfig, "rivals" | "bands" | "venues" | "promoPackages">>(
    key: K,
    value: GameDesignConfig[K],
  ) {
    setDesign((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateRival(rivalId: string, patch: Partial<GameRivalDesign>) {
    setDesign((prev) => ({
      ...prev,
      rivals: prev.rivals.map((rival) =>
        rival.id === rivalId
          ? {
              ...rival,
              ...patch,
            }
          : rival,
      ),
    }));
  }

  function removeRival(rivalId: string) {
    setDesign((prev) => ({
      ...prev,
      rivals: prev.rivals.filter((rival) => rival.id !== rivalId),
    }));
  }

  function duplicateRival(index: number) {
    setDesign((prev) => {
      const source = prev.rivals[index];
      if (!source) {
        return prev;
      }

      const nextName = source.stageName ? `${source.stageName} Copy` : `Artist ${index + 2}`;
      const existingIds = prev.rivals.map((rival) => rival.id);
      const copy: GameRivalDesign = {
        ...source,
        stageName: nextName,
        id: toUniqueSlug(nextName, `rival-${prev.rivals.length + 1}`, existingIds),
      };

      const nextRivals = [...prev.rivals];
      nextRivals.splice(index + 1, 0, copy);

      return {
        ...prev,
        rivals: nextRivals,
      };
    });
  }

  function moveRival(index: number, direction: -1 | 1) {
    setDesign((prev) => {
      const toIndex = index + direction;

      return {
        ...prev,
        rivals: moveArrayItem(prev.rivals, index, toIndex),
      };
    });
  }

  function addBlankRival() {
    setDesign((prev) => ({
      ...prev,
      rivals: [...prev.rivals, createEmptyRival(prev.rivals.length)],
    }));
  }

  function addGuestAsRival(artistName: string) {
    const trimmed = artistName.trim();
    if (!trimmed) {
      return;
    }

    setDesign((prev) => {
      const exists = prev.rivals.some(
        (rival) => rival.stageName.toLowerCase() === trimmed.toLowerCase(),
      );

      if (exists) {
        return prev;
      }

      return {
        ...prev,
        rivals: [...prev.rivals, createRivalFromGuest(trimmed, prev.rivals.length)],
      };
    });
  }

  function updateBand(index: number, patch: Partial<BookingBandDesign>) {
    setDesign((prev) => {
      const next = [...prev.bands];
      next[index] = {
        ...next[index],
        ...patch,
      };

      return {
        ...prev,
        bands: next,
      };
    });
  }

  function removeBand(index: number) {
    setDesign((prev) => ({
      ...prev,
      bands: prev.bands.filter((_, bandIndex) => bandIndex !== index),
    }));
  }

  function duplicateBand(index: number) {
    setDesign((prev) => {
      const source = prev.bands[index];
      if (!source) {
        return prev;
      }

      const nextName = source.stageName ? `${source.stageName} Copy` : `Band ${index + 2}`;
      const existingIds = prev.bands.map((band) => band.id);
      const copy: BookingBandDesign = {
        ...source,
        stageName: nextName,
        id: toUniqueSlug(nextName, `band-${prev.bands.length + 1}`, existingIds),
      };

      const nextBands = [...prev.bands];
      nextBands.splice(index + 1, 0, copy);

      return {
        ...prev,
        bands: nextBands,
      };
    });
  }

  function moveBand(index: number, direction: -1 | 1) {
    setDesign((prev) => {
      const toIndex = index + direction;

      return {
        ...prev,
        bands: moveArrayItem(prev.bands, index, toIndex),
      };
    });
  }

  function addBand() {
    setDesign((prev) => ({
      ...prev,
      bands: [...prev.bands, createEmptyBand(prev.bands.length)],
    }));
  }

  async function uploadBandPhoto(index: number, file: File) {
    try {
      const photoUrl = await readImageAsDataUrl(file);
      updateBand(index, { photoUrl });
      setMessage(toUploadSuccessMessage("Band"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : toUploadErrorMessage("band"));
    }
  }

  function generateBandsFromArtistRoster() {
    setDesign((prev) => ({
      ...prev,
      bands: prev.rivals.map((rival, index) => createBandFromRival(rival, index)),
    }));
  }

  function updateVenue(index: number, patch: Partial<BookingVenueDesign>) {
    setDesign((prev) => {
      const next = [...prev.venues];
      next[index] = {
        ...next[index],
        ...patch,
      };

      return {
        ...prev,
        venues: next,
      };
    });
  }

  function removeVenue(index: number) {
    setDesign((prev) => ({
      ...prev,
      venues: prev.venues.filter((_, venueIndex) => venueIndex !== index),
    }));
  }

  function duplicateVenue(index: number) {
    setDesign((prev) => {
      const source = prev.venues[index];
      if (!source) {
        return prev;
      }

      const nextName = source.name ? `${source.name} Copy` : `Venue ${index + 2}`;
      const existingIds = prev.venues.map((venue) => venue.id);
      const copy: BookingVenueDesign = {
        ...source,
        name: nextName,
        id: toUniqueSlug(nextName, `venue-${prev.venues.length + 1}`, existingIds),
      };

      const nextVenues = [...prev.venues];
      nextVenues.splice(index + 1, 0, copy);

      return {
        ...prev,
        venues: nextVenues,
      };
    });
  }

  function moveVenue(index: number, direction: -1 | 1) {
    setDesign((prev) => {
      const toIndex = index + direction;

      return {
        ...prev,
        venues: moveArrayItem(prev.venues, index, toIndex),
      };
    });
  }

  function addVenue() {
    setDesign((prev) => ({
      ...prev,
      venues: [...prev.venues, createEmptyVenue(prev.venues.length)],
    }));
  }

  async function uploadVenuePhoto(index: number, file: File) {
    try {
      const photoUrl = await readImageAsDataUrl(file);
      updateVenue(index, { photoUrl });
      setMessage(toUploadSuccessMessage("Venue"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : toUploadErrorMessage("venue"));
    }
  }

  function updatePromo(index: number, patch: Partial<BookingPromoPackage>) {
    setDesign((prev) => {
      const next = [...prev.promoPackages];
      next[index] = {
        ...next[index],
        ...patch,
      };

      return {
        ...prev,
        promoPackages: next,
      };
    });
  }

  function removePromo(index: number) {
    setDesign((prev) => ({
      ...prev,
      promoPackages: prev.promoPackages.filter((_, promoIndex) => promoIndex !== index),
    }));
  }

  function duplicatePromo(index: number) {
    setDesign((prev) => {
      const source = prev.promoPackages[index];
      if (!source) {
        return prev;
      }

      const nextLabel = source.label ? `${source.label} Copy` : `Promo ${index + 2}`;
      const existingIds = prev.promoPackages.map((promo) => promo.id);
      const copy: BookingPromoPackage = {
        ...source,
        label: nextLabel,
        id: toUniqueSlug(nextLabel, `promo-${prev.promoPackages.length + 1}`, existingIds),
      };

      const nextPromos = [...prev.promoPackages];
      nextPromos.splice(index + 1, 0, copy);

      return {
        ...prev,
        promoPackages: nextPromos,
      };
    });
  }

  function movePromo(index: number, direction: -1 | 1) {
    setDesign((prev) => {
      const toIndex = index + direction;

      return {
        ...prev,
        promoPackages: moveArrayItem(prev.promoPackages, index, toIndex),
      };
    });
  }

  function addPromo() {
    setDesign((prev) => ({
      ...prev,
      promoPackages: [...prev.promoPackages, createEmptyPromo(prev.promoPackages.length)],
    }));
  }

  function updateSceneEvent(index: number, patch: Partial<SceneEventDesign>) {
    setDesign((prev) => {
      const next = [...prev.sceneEvents];
      next[index] = {
        ...next[index],
        ...patch,
      };

      return {
        ...prev,
        sceneEvents: next,
      };
    });
  }

  function addSceneEvent() {
    setDesign((prev) => ({
      ...prev,
      sceneEvents: [
        ...prev.sceneEvents,
        {
          id: `scene-event-${prev.sceneEvents.length + 1}`,
          label: `Scene event ${prev.sceneEvents.length + 1}`,
          chance: 0.1,
          moneyDelta: 0,
          fameDelta: 0,
          sceneCredDelta: 0,
          fanTrustDelta: 0,
          enabled: true,
        },
      ],
    }));
  }

  function removeSceneEvent(index: number) {
    setDesign((prev) => ({
      ...prev,
      sceneEvents: prev.sceneEvents.filter((_, sceneIndex) => sceneIndex !== index),
    }));
  }

  function updateFeaturedGuestBonus<K extends keyof FeaturedGuestBonusSettings>(
    key: K,
    value: FeaturedGuestBonusSettings[K],
  ) {
    setDesign((prev) => ({
      ...prev,
      featuredGuestBonus: {
        ...prev.featuredGuestBonus,
        [key]: value,
      },
    }));
  }

  function updateSeasonSettings<K extends keyof SeasonSettings>(
    key: K,
    value: SeasonSettings[K],
  ) {
    setDesign((prev) => ({
      ...prev,
      seasonSettings: {
        ...prev.seasonSettings,
        [key]: value,
      },
    }));
  }

  async function simulateNight() {
    setMessage("");
    setSimulating(true);

    try {
      const secret = adminSecret.trim();
      if (!secret) {
        throw new Error("Enter admin secret first.");
      }

      const response = await fetch("/api/admin/game/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          design,
          venueId: simVenueId,
          bandIds: simBandIds,
          promoIds: simPromoIds,
          week: simWeek,
          day: simDay,
        }),
      });

      const body = (await response.json()) as {
        simulation?: SimulateNightResult;
        error?: string;
      };

      if (!response.ok || !body.simulation) {
        throw new Error(body.error || "Simulation failed.");
      }

      setSimResult(body.simulation);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSimulating(false);
    }
  }

  async function resetPlayers() {
    setMessage("");
    setResettingPlayers(true);

    try {
      const secret = adminSecret.trim();
      if (!secret) {
        throw new Error("Enter admin secret first.");
      }

      if (!window.confirm("Reset all booking players? This cannot be undone.")) {
        return;
      }

      const response = await fetch("/api/admin/game/players", {
        method: "DELETE",
        headers: {
          "x-admin-secret": secret,
        },
      });

      const body = (await response.json()) as {
        ok?: boolean;
        deletedPlayers?: number;
        error?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Failed to reset players.");
      }

      setMessage(`Reset complete. Removed ${body.deletedPlayers ?? 0} player records.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setResettingPlayers(false);
    }
  }

  async function resetDesignToDefaults() {
    setMessage("");
    setResettingDesign(true);

    try {
      const secret = adminSecret.trim();
      if (!secret) {
        throw new Error("Enter admin secret first.");
      }

      if (!window.confirm("Reset the full game design to defaults? This overwrites current custom settings.")) {
        return;
      }

      const response = await fetch("/api/admin/game/reset", {
        method: "POST",
        headers: {
          "x-admin-secret": secret,
        },
      });

      const body = (await response.json()) as {
        ok?: boolean;
        design?: GameDesignConfig;
        error?: string;
      };

      if (!response.ok || !body.ok || !body.design) {
        throw new Error(body.error || "Failed to reset game design.");
      }

      setDesign(body.design);
      setSimVenueId("");
      setSimBandIds([]);
      setSimPromoIds([]);
      setSimResult(null);
      lastSavedDesignRef.current = JSON.stringify(body.design);
      setHasLoadedDesign(true);
      setAutoSaveState("saved");
      setMessage("Game design reset to defaults (before custom band/venue imports).");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setResettingDesign(false);
    }
  }

  async function resetBandsAndVenuesToDefaults() {
    setMessage("");
    setResettingLineup(true);

    try {
      const secret = adminSecret.trim();
      if (!secret) {
        throw new Error("Enter admin secret first.");
      }

      if (!window.confirm("Reset only bands and venues to defaults? Other game settings will stay as-is.")) {
        return;
      }

      const response = await fetch("/api/admin/game/reset-lineup", {
        method: "POST",
        headers: {
          "x-admin-secret": secret,
        },
      });

      const body = (await response.json()) as {
        ok?: boolean;
        design?: GameDesignConfig;
        error?: string;
      };

      if (!response.ok || !body.ok || !body.design) {
        throw new Error(body.error || "Failed to reset bands and venues.");
      }

      setDesign(body.design);
      setSimVenueId("");
      setSimBandIds([]);
      setSimPromoIds([]);
      setSimResult(null);
      lastSavedDesignRef.current = JSON.stringify(body.design);
      setHasLoadedDesign(true);
      setAutoSaveState("saved");
      setMessage("Bands and venues reset to defaults. Other game settings were preserved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setResettingLineup(false);
    }
  }

  function exportBandsCsv() {
    const headers = ["id", "stageName", "genre", "draw", "fee", "reliability", "crowdEnergy", "enabled", "photoUrl"];
    const rows = design.bands.map((band) =>
      [band.id, band.stageName, band.genre, band.draw, band.fee, band.reliability, band.crowdEnergy, band.enabled, band.photoUrl]
        .map((cell) => toCsvCell(cell))
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "bands.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportVenuesCsv() {
    const headers = ["id", "name", "capacity", "baseRent", "prestige", "enabled", "genreAffinity", "photoUrl"];
    const rows = design.venues.map((venue) => {
      const affinity = Object.entries(venue.genreAffinity)
        .map(([key, value]) => `${key}:${value}`)
        .join("|");

      return [venue.id, venue.name, venue.capacity, venue.baseRent, venue.prestige, venue.enabled, affinity, venue.photoUrl]
        .map((cell) => toCsvCell(cell))
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "venues.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBandsCsv(text: string) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setMessage("Bands CSV was empty or missing data rows.");
      return;
    }

    const imported = lines.slice(1).map((line, index) => {
      const [id, stageName, genre, draw, fee, reliability, crowdEnergy, enabled, photoUrl] = parseCsvLine(line);

      return {
        id: (id || `band-${index + 1}`).trim(),
        stageName: (stageName || `Band ${index + 1}`).trim(),
        genre: (genre || "Rock").trim(),
        draw: Number.parseInt(draw || "60", 10),
        fee: Number.parseInt(fee || "70", 10),
        reliability: Number.parseInt(reliability || "72", 10),
        crowdEnergy: Number.parseInt(crowdEnergy || "65", 10),
        enabled: enabled ? enabled.toLowerCase() !== "false" : true,
        photoUrl: (photoUrl || "").trim(),
      } satisfies BookingBandDesign;
    });

    setDesign((prev) => ({
      ...prev,
      bands: imported,
    }));
    setHasLoadedDesign(true);
    setAutoSaveState(adminSecret.trim() ? "pending" : "idle");
    setMessage(
      adminSecret.trim()
        ? "Bands imported. Autosave will persist the changes shortly."
        : "Bands imported locally. Enter admin secret and save to persist.",
    );
  }

  function importVenuesCsv(text: string) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setMessage("Venues CSV was empty or missing data rows.");
      return;
    }

    const imported = lines.slice(1).map((line, index) => {
      const [id, name, capacity, baseRent, prestige, enabled, genreAffinity, photoUrl] = parseCsvLine(line);

      const parsedAffinity = (genreAffinity || "")
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const [key, rawValue] = item.split(":").map((segment) => segment.trim());
          const value = Number.parseFloat(rawValue || "0");

          if (!key || !Number.isFinite(value)) {
            return null;
          }

          return [key.toLowerCase(), value] as const;
        })
        .filter((entry): entry is readonly [string, number] => entry !== null);

      return {
        id: (id || `venue-${index + 1}`).trim(),
        name: (name || `Venue ${index + 1}`).trim(),
        capacity: Number.parseInt(capacity || "180", 10),
        baseRent: Number.parseInt(baseRent || "80", 10),
        prestige: Number.parseInt(prestige || "2", 10),
        enabled: enabled ? enabled.toLowerCase() !== "false" : true,
        genreAffinity: Object.fromEntries(parsedAffinity),
        photoUrl: (photoUrl || "").trim(),
      } satisfies BookingVenueDesign;
    });

    setDesign((prev) => ({
      ...prev,
      venues: imported,
    }));
    setHasLoadedDesign(true);
    setAutoSaveState(adminSecret.trim() ? "pending" : "idle");
    setMessage(
      adminSecret.trim()
        ? "Venues imported. Autosave will persist the changes shortly."
        : "Venues imported locally. Enter admin secret and save to persist.",
    );
  }

  function cloneBandTemplate() {
    if (!design.bands.length) {
      addBand();
      return;
    }

    duplicateBand(0);
  }

  function cloneVenueTemplate() {
    if (!design.venues.length) {
      addVenue();
      return;
    }

    duplicateVenue(0);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!loading && !saving) {
          void saveDesign();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [loading, saving, saveDesign]);

  return (
    <div className="comic-bg min-h-screen px-4 py-8 sm:px-8">
      <main className="mx-auto max-w-6xl">
        <section className="paper-panel space-y-6">
          <Link href="/admin" className="weekly-back-btn inline-block">
            ← Back to Admin
          </Link>

          <div className="space-y-2">
            <h1 className="panel-title">George Street Booking Manager Designer</h1>
            <p className="week-meta">
              Configure local artists, venues, and promo packages for your show-driven booking game.
            </p>
          </div>

          <form onSubmit={loadDesign} className="admin-tools">
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Admin secret"
              className="admin-input"
            />
            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? "Loading..." : "Load Design"}
            </button>
            <button type="button" className="admin-btn" onClick={saveDesign} disabled={saving}>
              {saving ? "Saving..." : "Save Design"}
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={resetDesignToDefaults}
              disabled={resettingDesign || resettingLineup || loading || saving}
            >
              {resettingDesign ? "Resetting..." : "Reset Game To Defaults"}
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={resetBandsAndVenuesToDefaults}
              disabled={resettingLineup || resettingDesign || loading || saving}
            >
              {resettingLineup ? "Resetting..." : "Reset Bands + Venues Only"}
            </button>
            <Link href="/game" className="admin-btn text-center">
              Open George Street Booking Manager
            </Link>
          </form>

          <div className="flex flex-wrap items-center gap-4">
            <label className="track-meta flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(event) => setAutoSaveEnabled(event.target.checked)}
              />
              Autosave changes
            </label>
            <p className="track-meta">Autosave status: {autoSaveStatusLabel}</p>
            <p className="track-meta">Shortcut: Ctrl+S / Cmd+S to save now</p>
          </div>

          {message ? <p className="admin-message">{message}</p> : null}

          <input
            ref={bandCsvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              const text = await file.text();
              importBandsCsv(text);
              event.target.value = "";
            }}
          />

          <input
            ref={venueCsvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              const text = await file.text();
              importVenuesCsv(text);
              event.target.value = "";
            }}
          />

          <article className="admin-card">
            <h2 className="track-title">Game Theme</h2>
            <p className="track-meta">These lines shape the game atmosphere and objective copy.</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={design.cityName}
                onChange={(event) => updateTopLevelField("cityName", event.target.value)}
                className="admin-input"
                placeholder="City name"
              />
              <input
                value={design.titleGoal}
                onChange={(event) => updateTopLevelField("titleGoal", event.target.value)}
                className="admin-input"
                placeholder="Goal title"
              />
            </div>

            <textarea
              value={design.introLine}
              onChange={(event) => updateTopLevelField("introLine", event.target.value)}
              className="admin-textarea mt-3"
              rows={2}
              placeholder="Intro line"
            />

            <textarea
              value={design.jamOffLine}
              onChange={(event) => updateTopLevelField("jamOffLine", event.target.value)}
              className="admin-textarea mt-3"
              rows={2}
              placeholder="Booking manager description"
            />
          </article>

          <article className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="track-title">Season Controls</h2>
                <p className="track-meta">Tune season length and win thresholds, or reset all active players.</p>
              </div>
              <button
                type="button"
                className="admin-btn"
                onClick={resetPlayers}
                disabled={resettingPlayers}
              >
                {resettingPlayers ? "Resetting..." : "Reset All Players"}
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="track-meta mb-1">Weeks Per Season</p>
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  value={design.seasonSettings.weeksPerSeason}
                  onChange={(event) =>
                    updateSeasonSettings("weeksPerSeason", Number.parseInt(event.target.value || "0", 10))
                  }
                  className={`admin-input ${toNumberError(design.seasonSettings.weeksPerSeason, 1, 12, "Weeks Per Season") ? INVALID_INPUT_CLASS : ""}`}
                />
                {toNumberError(design.seasonSettings.weeksPerSeason, 1, 12, "Weeks Per Season") ? (
                  <p className="track-meta mt-1 text-red-700">{toNumberError(design.seasonSettings.weeksPerSeason, 1, 12, "Weeks Per Season")}</p>
                ) : null}
              </div>
              <div>
                <p className="track-meta mb-1">Days Per Week</p>
                <input
                  type="number"
                  min={1}
                  max={7}
                  step={1}
                  value={design.seasonSettings.daysPerWeek}
                  onChange={(event) =>
                    updateSeasonSettings("daysPerWeek", Number.parseInt(event.target.value || "0", 10))
                  }
                  className={`admin-input ${toNumberError(design.seasonSettings.daysPerWeek, 1, 7, "Days Per Week") ? INVALID_INPUT_CLASS : ""}`}
                />
                {toNumberError(design.seasonSettings.daysPerWeek, 1, 7, "Days Per Week") ? (
                  <p className="track-meta mt-1 text-red-700">{toNumberError(design.seasonSettings.daysPerWeek, 1, 7, "Days Per Week")}</p>
                ) : null}
              </div>
              <div>
                <p className="track-meta mb-1">Win Threshold: Fame</p>
                <input
                  type="number"
                  min={0}
                  max={250}
                  step={1}
                  value={design.seasonSettings.winThresholdFame}
                  onChange={(event) =>
                    updateSeasonSettings("winThresholdFame", Number.parseInt(event.target.value || "0", 10))
                  }
                  className={`admin-input ${toNumberError(design.seasonSettings.winThresholdFame, 0, 250, "Win Threshold: Fame") ? INVALID_INPUT_CLASS : ""}`}
                />
                {toNumberError(design.seasonSettings.winThresholdFame, 0, 250, "Win Threshold: Fame") ? (
                  <p className="track-meta mt-1 text-red-700">{toNumberError(design.seasonSettings.winThresholdFame, 0, 250, "Win Threshold: Fame")}</p>
                ) : null}
              </div>
              <div>
                <p className="track-meta mb-1">Win Threshold: Scene Cred</p>
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={1}
                  value={design.seasonSettings.winThresholdSceneCred}
                  onChange={(event) =>
                    updateSeasonSettings("winThresholdSceneCred", Number.parseInt(event.target.value || "0", 10))
                  }
                  className={`admin-input ${toNumberError(design.seasonSettings.winThresholdSceneCred, 0, 120, "Win Threshold: Scene Cred") ? INVALID_INPUT_CLASS : ""}`}
                />
                {toNumberError(design.seasonSettings.winThresholdSceneCred, 0, 120, "Win Threshold: Scene Cred") ? (
                  <p className="track-meta mt-1 text-red-700">{toNumberError(design.seasonSettings.winThresholdSceneCred, 0, 120, "Win Threshold: Scene Cred")}</p>
                ) : null}
              </div>
              <div>
                <p className="track-meta mb-1">Win Threshold: Fan Trust</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={design.seasonSettings.winThresholdFanTrust}
                  onChange={(event) =>
                    updateSeasonSettings("winThresholdFanTrust", Number.parseInt(event.target.value || "0", 10))
                  }
                  className={`admin-input ${toNumberError(design.seasonSettings.winThresholdFanTrust, 0, 100, "Win Threshold: Fan Trust") ? INVALID_INPUT_CLASS : ""}`}
                />
                {toNumberError(design.seasonSettings.winThresholdFanTrust, 0, 100, "Win Threshold: Fan Trust") ? (
                  <p className="track-meta mt-1 text-red-700">{toNumberError(design.seasonSettings.winThresholdFanTrust, 0, 100, "Win Threshold: Fan Trust")}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <p className="track-meta">Featured Guest Bonus</p>
              <label className="track-meta mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={design.featuredGuestBonus.enabled}
                  onChange={(event) => updateFeaturedGuestBonus("enabled", event.target.checked)}
                />
                Enable featured guest bonuses
              </label>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="track-meta mb-1">Money Bonus</p>
                  <input
                    type="number"
                    min={-300}
                    max={300}
                    step={1}
                    value={design.featuredGuestBonus.moneyBonus}
                    onChange={(event) =>
                      updateFeaturedGuestBonus("moneyBonus", Number.parseInt(event.target.value || "0", 10))
                    }
                    className={`admin-input ${toNumberError(design.featuredGuestBonus.moneyBonus, -300, 300, "Money Bonus") ? INVALID_INPUT_CLASS : ""}`}
                  />
                  {toNumberError(design.featuredGuestBonus.moneyBonus, -300, 300, "Money Bonus") ? (
                    <p className="track-meta mt-1 text-red-700">{toNumberError(design.featuredGuestBonus.moneyBonus, -300, 300, "Money Bonus")}</p>
                  ) : null}
                </div>
                <div>
                  <p className="track-meta mb-1">Fame Bonus</p>
                  <input
                    type="number"
                    min={-20}
                    max={20}
                    step={1}
                    value={design.featuredGuestBonus.fameBonus}
                    onChange={(event) =>
                      updateFeaturedGuestBonus("fameBonus", Number.parseInt(event.target.value || "0", 10))
                    }
                    className={`admin-input ${toNumberError(design.featuredGuestBonus.fameBonus, -20, 20, "Fame Bonus") ? INVALID_INPUT_CLASS : ""}`}
                  />
                  {toNumberError(design.featuredGuestBonus.fameBonus, -20, 20, "Fame Bonus") ? (
                    <p className="track-meta mt-1 text-red-700">{toNumberError(design.featuredGuestBonus.fameBonus, -20, 20, "Fame Bonus")}</p>
                  ) : null}
                </div>
                <div>
                  <p className="track-meta mb-1">Scene Cred Bonus</p>
                  <input
                    type="number"
                    min={-20}
                    max={20}
                    step={1}
                    value={design.featuredGuestBonus.sceneCredBonus}
                    onChange={(event) =>
                      updateFeaturedGuestBonus("sceneCredBonus", Number.parseInt(event.target.value || "0", 10))
                    }
                    className={`admin-input ${toNumberError(design.featuredGuestBonus.sceneCredBonus, -20, 20, "Scene Cred Bonus") ? INVALID_INPUT_CLASS : ""}`}
                  />
                  {toNumberError(design.featuredGuestBonus.sceneCredBonus, -20, 20, "Scene Cred Bonus") ? (
                    <p className="track-meta mt-1 text-red-700">{toNumberError(design.featuredGuestBonus.sceneCredBonus, -20, 20, "Scene Cred Bonus")}</p>
                  ) : null}
                </div>
                <div>
                  <p className="track-meta mb-1">Fan Trust Bonus</p>
                  <input
                    type="number"
                    min={-20}
                    max={20}
                    step={1}
                    value={design.featuredGuestBonus.fanTrustBonus}
                    onChange={(event) =>
                      updateFeaturedGuestBonus("fanTrustBonus", Number.parseInt(event.target.value || "0", 10))
                    }
                    className={`admin-input ${toNumberError(design.featuredGuestBonus.fanTrustBonus, -20, 20, "Fan Trust Bonus") ? INVALID_INPUT_CLASS : ""}`}
                  />
                  {toNumberError(design.featuredGuestBonus.fanTrustBonus, -20, 20, "Fan Trust Bonus") ? (
                    <p className="track-meta mt-1 text-red-700">{toNumberError(design.featuredGuestBonus.fanTrustBonus, -20, 20, "Fan Trust Bonus")}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </article>

          <article className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="track-title">Simulate Night</h2>
                <p className="track-meta">Preview lineup outcomes instantly using current unsaved settings.</p>
              </div>
              <button type="button" className="admin-btn" onClick={simulateNight} disabled={simulating}>
                {simulating ? "Simulating..." : "Run Simulation"}
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="track-meta mb-1">Venue</p>
                <select
                  value={simVenueId}
                  onChange={(event) => setSimVenueId(event.target.value)}
                  className="admin-input"
                >
                  <option value="">Choose venue</option>
                  {design.venues.filter((venue) => venue.enabled).map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="track-meta mb-1">Week</p>
                <input
                  type="number"
                  min={1}
                  max={design.seasonSettings.weeksPerSeason}
                  value={simWeek}
                  onChange={(event) => setSimWeek(Number.parseInt(event.target.value || "1", 10))}
                  className="admin-input"
                />
              </div>

              <div>
                <p className="track-meta mb-1">Day</p>
                <input
                  type="number"
                  min={1}
                  max={design.seasonSettings.daysPerWeek}
                  value={simDay}
                  onChange={(event) => setSimDay(Number.parseInt(event.target.value || "1", 10))}
                  className="admin-input"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="track-meta mb-1">Bands (up to 3)</p>
                <div className="space-y-1">
                  {design.bands.filter((band) => band.enabled).map((band) => (
                    <label key={band.id} className="track-meta flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={simBandIds.includes(band.id)}
                        onChange={(event) => {
                          setSimBandIds((prev) => {
                            if (event.target.checked) {
                              if (prev.includes(band.id) || prev.length >= 3) {
                                return prev;
                              }
                              return [...prev, band.id];
                            }

                            return prev.filter((id) => id !== band.id);
                          });
                        }}
                      />
                      {band.stageName}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="track-meta mb-1">Promos</p>
                <div className="space-y-1">
                  {design.promoPackages.map((promo) => (
                    <label key={promo.id} className="track-meta flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={simPromoIds.includes(promo.id)}
                        onChange={(event) => {
                          setSimPromoIds((prev) =>
                            event.target.checked
                              ? prev.includes(promo.id)
                                ? prev
                                : [...prev, promo.id]
                              : prev.filter((id) => id !== promo.id),
                          );
                        }}
                      />
                      {promo.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {simResult ? (
              <div className="mt-4 rounded border border-black p-3">
                <p className="track-title">Simulation Result</p>
                <p className="track-meta mt-1">
                  {simResult.showResult.venueName} • Attendance {simResult.showResult.attendance}/{simResult.showResult.capacity} • Profit {simResult.showResult.profit >= 0 ? "+" : ""}{simResult.showResult.profit}
                </p>
                <p className="track-meta mt-1">
                  Featured guest: {simResult.featuredGuestOfWeek ?? "None"}
                  {simResult.showResult.featuredGuestHit ? " (bonus hit)" : ""}
                </p>
                <ul className="mt-2 space-y-1">
                  {simResult.lines.map((line, index) => (
                    <li key={`${line}-${index}`} className="track-meta">{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          <article className="admin-card">
            <h2 className="track-title">Musical Guests</h2>
            <p className="track-meta">
              Quick add artists from your synced archive ({guestSuggestions.length} found).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guestSuggestions.slice(0, 60).map((guest) => (
                <button
                  key={guest.artistName}
                  type="button"
                  className="admin-btn"
                  onClick={() => addGuestAsRival(guest.artistName)}
                >
                  + {guest.artistName} ({guest.trackCount})
                </button>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="track-title">Artist Roster</h2>
                <p className="track-meta">
                  {design.rivals.length} artists configured, {activeRivalCount} active.
                </p>
              </div>
              <button type="button" className="admin-btn" onClick={addBlankRival}>
                Add Artist
              </button>
            </div>

            <div className="admin-grid mt-4">
              {design.rivals.map((rival, index) => (
                <article key={`rival-${index}`} className="admin-card">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="track-title">{rival.stageName || `Artist ${index + 1}`}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveRival(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveRival(index, 1)}
                        disabled={index === design.rivals.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => duplicateRival(index)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          const label = rival.stageName || `Artist ${index + 1}`;
                          if (window.confirm(`Remove ${label}?`)) {
                            removeRival(rival.id);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <label className="track-meta mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rival.enabled}
                      onChange={(event) => updateRival(rival.id, { enabled: event.target.checked })}
                    />
                    Enabled in booking game
                  </label>

                  <div className="mt-3 space-y-3">
                    <p className="track-meta">Identity</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="track-meta mb-1">Stage Name</p>
                        <input
                          value={rival.stageName}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            updateRival(rival.id, {
                              stageName: nextName,
                              id: toSlug(nextName, `rival-${index + 1}`),
                            });
                          }}
                          className="admin-input"
                          placeholder="Stage name"
                        />
                      </div>

                      <div>
                        <p className="track-meta mb-1">Hometown</p>
                        <input
                          value={rival.hometown}
                          onChange={(event) => updateRival(rival.id, { hometown: event.target.value })}
                          className="admin-input"
                          placeholder="Hometown"
                        />
                      </div>

                      <div>
                        <p className="track-meta mb-1">Genre</p>
                        <input
                          value={rival.genre}
                          onChange={(event) => updateRival(rival.id, { genre: event.target.value })}
                          className="admin-input"
                          placeholder="Genre"
                        />
                      </div>

                      <div>
                        <p className="track-meta mb-1">Signature Move</p>
                        <input
                          value={rival.signatureMove}
                          onChange={(event) =>
                            updateRival(rival.id, { signatureMove: event.target.value })
                          }
                          className="admin-input"
                          placeholder="Signature move"
                        />
                      </div>
                    </div>

                    <p className="track-meta">Legacy Stats (used when generating bands)</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="track-meta mb-1">Attack</p>
                      <input
                        type="number"
                        min={3}
                        max={40}
                        step={1}
                        value={rival.attack}
                        onChange={(event) =>
                          updateRival(rival.id, { attack: Number.parseInt(event.target.value || "0", 10) })
                        }
                        className={`admin-input ${toNumberError(rival.attack, 3, 40, "Attack") ? INVALID_INPUT_CLASS : ""}`}
                        placeholder="Attack"
                      />
                      <p className="track-meta mt-1">Influences draw and crowd impact. Range: 3-40</p>
                      {toNumberError(rival.attack, 3, 40, "Attack") ? (
                        <p className="track-meta mt-1 text-red-700">{toNumberError(rival.attack, 3, 40, "Attack")}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="track-meta mb-1">Defense</p>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        step={1}
                        value={rival.defense}
                        onChange={(event) =>
                          updateRival(rival.id, { defense: Number.parseInt(event.target.value || "0", 10) })
                        }
                        className={`admin-input ${toNumberError(rival.defense, 1, 40, "Defense") ? INVALID_INPUT_CLASS : ""}`}
                        placeholder="Defense"
                      />
                      <p className="track-meta mt-1">Influences reliability and draw. Range: 1-40</p>
                      {toNumberError(rival.defense, 1, 40, "Defense") ? (
                        <p className="track-meta mt-1 text-red-700">{toNumberError(rival.defense, 1, 40, "Defense")}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="track-meta mb-1">Stamina</p>
                      <input
                        type="number"
                        min={12}
                        max={180}
                        step={1}
                        value={rival.stamina}
                        onChange={(event) =>
                          updateRival(rival.id, { stamina: Number.parseInt(event.target.value || "0", 10) })
                        }
                        className={`admin-input ${toNumberError(rival.stamina, 12, 180, "Stamina") ? INVALID_INPUT_CLASS : ""}`}
                        placeholder="Stamina"
                      />
                      <p className="track-meta mt-1">General artist endurance metric. Range: 12-180</p>
                      {toNumberError(rival.stamina, 12, 180, "Stamina") ? (
                        <p className="track-meta mt-1 text-red-700">{toNumberError(rival.stamina, 12, 180, "Stamina")}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="track-meta mb-1">XP Reward</p>
                      <input
                        type="number"
                        min={2}
                        max={400}
                        step={1}
                        value={rival.xpReward}
                        onChange={(event) =>
                          updateRival(rival.id, {
                            xpReward: Number.parseInt(event.target.value || "0", 10),
                          })
                        }
                        className={`admin-input ${toNumberError(rival.xpReward, 2, 400, "XP Reward") ? INVALID_INPUT_CLASS : ""}`}
                        placeholder="XP reward"
                      />
                      <p className="track-meta mt-1">Used for derived band fee defaults. Range: 2-400</p>
                      {toNumberError(rival.xpReward, 2, 400, "XP Reward") ? (
                        <p className="track-meta mt-1 text-red-700">{toNumberError(rival.xpReward, 2, 400, "XP Reward")}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="track-meta mb-1">Gold Reward</p>
                      <input
                        type="number"
                        min={0}
                        max={400}
                        step={1}
                        value={rival.goldReward}
                        onChange={(event) =>
                          updateRival(rival.id, {
                            goldReward: Number.parseInt(event.target.value || "0", 10),
                          })
                        }
                        className={`admin-input ${toNumberError(rival.goldReward, 0, 400, "Gold Reward") ? INVALID_INPUT_CLASS : ""}`}
                        placeholder="Gold reward"
                      />
                      <p className="track-meta mt-1">Used for derived economy defaults. Range: 0-400</p>
                      {toNumberError(rival.goldReward, 0, 400, "Gold Reward") ? (
                        <p className="track-meta mt-1 text-red-700">{toNumberError(rival.goldReward, 0, 400, "Gold Reward")}</p>
                      ) : null}
                    </div>
                  </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="track-title">Bands (Booking Stats)</h2>
                <p className="track-meta">
                  {design.bands.length} bands configured, {activeBandCount} active.
                </p>
                <p className="track-meta">
                  These stats are used directly by the game when at least one band is enabled.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-btn" onClick={generateBandsFromArtistRoster}>
                  Generate from Artist Roster
                </button>
                <button type="button" className="admin-btn" onClick={cloneBandTemplate}>
                  Clone Band Template
                </button>
                <button type="button" className="admin-btn" onClick={exportBandsCsv}>
                  Export Bands CSV
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => bandCsvInputRef.current?.click()}
                >
                  Import Bands CSV
                </button>
                <button type="button" className="admin-btn" onClick={addBand}>
                  Add Band
                </button>
              </div>
            </div>

            <div className="admin-grid mt-4">
              {design.bands.map((band, index) => (
                <article key={`band-${index}`} className="admin-card">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="track-title">{band.stageName || `Band ${index + 1}`}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveBand(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveBand(index, 1)}
                        disabled={index === design.bands.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => duplicateBand(index)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          const label = band.stageName || `Band ${index + 1}`;
                          if (window.confirm(`Remove ${label}?`)) {
                            removeBand(index);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <label className="track-meta mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={band.enabled}
                      onChange={(event) => updateBand(index, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>

                  <div className="mt-3 space-y-3">
                    <p className="track-meta">Identity</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="track-meta mb-1">Stage Name</p>
                        <input
                          value={band.stageName}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            updateBand(index, {
                              stageName: nextName,
                              id: toSlug(nextName, `band-${index + 1}`),
                            });
                          }}
                          className="admin-input"
                          placeholder="Stage name"
                        />
                      </div>

                      <div>
                        <p className="track-meta mb-1">Band ID</p>
                        <input
                          value={band.id}
                          onChange={(event) => updateBand(index, { id: event.target.value })}
                          className="admin-input"
                          placeholder="Band id"
                        />
                        <p className="track-meta mt-1">Used internally by game data.</p>
                      </div>

                      <div>
                        <p className="track-meta mb-1">Genre</p>
                        <input
                          value={band.genre}
                          onChange={(event) => updateBand(index, { genre: event.target.value })}
                          className="admin-input"
                          placeholder="Genre"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <p className="track-meta mb-1">Band Photo</p>
                        {band.photoUrl ? (
                          <div
                            className="mb-2 h-36 w-full rounded border-2 border-black bg-cover bg-center"
                            style={{ backgroundImage: toImageBackground(band.photoUrl) }}
                          />
                        ) : (
                          <div className="mb-2 flex h-20 items-center justify-center rounded border border-dashed border-black bg-white text-xs uppercase tracking-wide text-gray-700">
                            No photo uploaded yet
                          </div>
                        )}

                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            value={band.photoUrl}
                            onChange={(event) => updateBand(index, { photoUrl: event.target.value })}
                            className="admin-input"
                            placeholder="https://... or uploaded data URL"
                          />
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => updateBand(index, { photoUrl: "" })}
                          >
                            Clear Photo
                          </button>
                        </div>

                        <label className="track-meta mt-2 block">
                          Upload Image File
                          <input
                            type="file"
                            accept="image/*"
                            className="admin-input mt-1"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                return;
                              }

                              await uploadBandPhoto(index, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <p className="track-meta mt-1">Upload up to 5MB. Images are auto-resized and compressed before saving.</p>
                      </div>
                    </div>

                    <p className="track-meta">Booking Stats</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="track-meta mb-1">Draw</p>
                        <input
                          type="number"
                          min={20}
                          max={220}
                          step={1}
                          value={band.draw}
                          onChange={(event) =>
                            updateBand(index, { draw: Number.parseInt(event.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(band.draw, 20, 220, "Draw") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Draw"
                        />
                        <p className="track-meta mt-1">How many fans they can pull. Range: 20-220</p>
                        {toNumberError(band.draw, 20, 220, "Draw") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(band.draw, 20, 220, "Draw")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Fee</p>
                        <input
                          type="number"
                          min={10}
                          max={400}
                          step={1}
                          value={band.fee}
                          onChange={(event) =>
                            updateBand(index, { fee: Number.parseInt(event.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(band.fee, 10, 400, "Fee") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Fee"
                        />
                        <p className="track-meta mt-1">Booking cost in game cash. Range: 10-400</p>
                        {toNumberError(band.fee, 10, 400, "Fee") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(band.fee, 10, 400, "Fee")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Reliability</p>
                        <input
                          type="number"
                          min={40}
                          max={99}
                          step={1}
                          value={band.reliability}
                          onChange={(event) =>
                            updateBand(index, {
                              reliability: Number.parseInt(event.target.value || "0", 10),
                            })
                          }
                          className={`admin-input ${toNumberError(band.reliability, 40, 99, "Reliability") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Reliability"
                        />
                        <p className="track-meta mt-1">Consistency of show performance. Range: 40-99</p>
                        {toNumberError(band.reliability, 40, 99, "Reliability") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(band.reliability, 40, 99, "Reliability")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Crowd Energy</p>
                        <input
                          type="number"
                          min={20}
                          max={100}
                          step={1}
                          value={band.crowdEnergy}
                          onChange={(event) =>
                            updateBand(index, {
                              crowdEnergy: Number.parseInt(event.target.value || "0", 10),
                            })
                          }
                          className={`admin-input ${toNumberError(band.crowdEnergy, 20, 100, "Crowd Energy") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Crowd energy"
                        />
                        <p className="track-meta mt-1">How hard they lift room hype. Range: 20-100</p>
                        {toNumberError(band.crowdEnergy, 20, 100, "Crowd Energy") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(band.crowdEnergy, 20, 100, "Crowd Energy")}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="track-title">Venues</h2>
                <p className="track-meta">
                  {design.venues.length} venues configured, {activeVenueCount} enabled.
                </p>
                <p className="track-meta">Edit capacity, rent, prestige, and genre affinity.</p>
              </div>
              <button type="button" className="admin-btn" onClick={addVenue}>
                Add Venue
              </button>
              <button type="button" className="admin-btn" onClick={cloneVenueTemplate}>
                Clone Venue Template
              </button>
              <button type="button" className="admin-btn" onClick={exportVenuesCsv}>
                Export Venues CSV
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => venueCsvInputRef.current?.click()}
              >
                Import Venues CSV
              </button>
            </div>

            <div className="admin-grid mt-4">
              {design.venues.map((venue, index) => (
                <article key={`venue-${index}`} className="admin-card">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="track-title">{venue.name || `Venue ${index + 1}`}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveVenue(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => moveVenue(index, 1)}
                        disabled={index === design.venues.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => duplicateVenue(index)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          const label = venue.name || `Venue ${index + 1}`;
                          if (window.confirm(`Remove ${label}?`)) {
                            removeVenue(index);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <label className="track-meta mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={venue.enabled}
                      onChange={(event) => updateVenue(index, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>

                  <div className="mt-3 space-y-3">
                    <p className="track-meta">Identity</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="track-meta mb-1">Venue Name</p>
                        <input
                          value={venue.name}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            updateVenue(index, {
                              name: nextName,
                              id: toSlug(nextName, `venue-${index + 1}`),
                            });
                          }}
                          className="admin-input"
                          placeholder="Venue name"
                        />
                      </div>

                      <div>
                        <p className="track-meta mb-1">Venue ID</p>
                        <input
                          value={venue.id}
                          onChange={(event) => updateVenue(index, { id: event.target.value })}
                          className="admin-input"
                          placeholder="Venue id"
                        />
                        <p className="track-meta mt-1">Used internally by game data.</p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="track-meta mb-1">Venue Photo</p>
                        {venue.photoUrl ? (
                          <div
                            className="mb-2 h-36 w-full rounded border-2 border-black bg-cover bg-center"
                            style={{ backgroundImage: toImageBackground(venue.photoUrl) }}
                          />
                        ) : (
                          <div className="mb-2 flex h-20 items-center justify-center rounded border border-dashed border-black bg-white text-xs uppercase tracking-wide text-gray-700">
                            No photo uploaded yet
                          </div>
                        )}

                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            value={venue.photoUrl}
                            onChange={(event) => updateVenue(index, { photoUrl: event.target.value })}
                            className="admin-input"
                            placeholder="https://... or uploaded data URL"
                          />
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => updateVenue(index, { photoUrl: "" })}
                          >
                            Clear Photo
                          </button>
                        </div>

                        <label className="track-meta mt-2 block">
                          Upload Image File
                          <input
                            type="file"
                            accept="image/*"
                            className="admin-input mt-1"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                return;
                              }

                              await uploadVenuePhoto(index, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <p className="track-meta mt-1">Upload up to 5MB. Images are auto-resized and compressed before saving.</p>
                      </div>
                    </div>

                    <p className="track-meta">Venue Stats</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="track-meta mb-1">Capacity</p>
                        <input
                          type="number"
                          min={40}
                          max={2000}
                          step={1}
                          value={venue.capacity}
                          onChange={(event) =>
                            updateVenue(index, { capacity: Number.parseInt(event.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(venue.capacity, 40, 2000, "Capacity") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Capacity"
                        />
                        <p className="track-meta mt-1">Max attendance for the venue. Range: 40-2000</p>
                        {toNumberError(venue.capacity, 40, 2000, "Capacity") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(venue.capacity, 40, 2000, "Capacity")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Base Rent</p>
                        <input
                          type="number"
                          min={0}
                          max={1200}
                          step={1}
                          value={venue.baseRent}
                          onChange={(event) =>
                            updateVenue(index, { baseRent: Number.parseInt(event.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(venue.baseRent, 0, 1200, "Base Rent") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Base rent"
                        />
                        <p className="track-meta mt-1">Fixed booking cost before bands/promo. Range: 0-1200</p>
                        {toNumberError(venue.baseRent, 0, 1200, "Base Rent") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(venue.baseRent, 0, 1200, "Base Rent")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Prestige</p>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          step={1}
                          value={venue.prestige}
                          onChange={(event) =>
                            updateVenue(index, { prestige: Number.parseInt(event.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(venue.prestige, 1, 8, "Prestige") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Prestige"
                        />
                        <p className="track-meta mt-1">Higher prestige boosts fame impact. Range: 1-8</p>
                        {toNumberError(venue.prestige, 1, 8, "Prestige") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(venue.prestige, 1, 8, "Prestige")}</p>
                        ) : null}
                      </div>
                    </div>

                    <p className="track-meta">Audience Fit</p>

                    <div>
                      <p className="track-meta mb-1">Genre Affinity Map</p>
                      <textarea
                        value={formatGenreAffinity(venue.genreAffinity)}
                        onChange={(event) =>
                          updateVenue(index, { genreAffinity: parseGenreAffinity(event.target.value) })
                        }
                        className="admin-textarea"
                        rows={2}
                        placeholder="genre:bonus, rock:0.15, indie:0.1"
                      />
                      <p className="track-meta mt-1">Genre bonus range per value: -0.4 to 0.6</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="track-title">Scene Events</h2>
                <p className="track-meta">Edit random events like weather, tech issues, and buzz boosts.</p>
              </div>
              <button type="button" className="admin-btn" onClick={addSceneEvent}>
                Add Scene Event
              </button>
            </div>

            <div className="admin-grid mt-4">
              {design.sceneEvents.map((event, index) => (
                <article key={`scene-event-${index}`} className="admin-card">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="track-title">{event.label || `Scene Event ${index + 1}`}</h3>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => removeSceneEvent(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <label className="track-meta mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={event.enabled}
                      onChange={(evt) => updateSceneEvent(index, { enabled: evt.target.checked })}
                    />
                    Enabled
                  </label>

                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="track-meta mb-1">Event Label</p>
                      <input
                        value={event.label}
                        onChange={(evt) => {
                          const nextLabel = evt.target.value;
                          updateSceneEvent(index, {
                            label: nextLabel,
                            id: toSlug(nextLabel, `scene-event-${index + 1}`),
                          });
                        }}
                        className="admin-input"
                        placeholder="Event description"
                      />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="track-meta mb-1">Chance (0 to 1)</p>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step="0.01"
                          value={event.chance}
                          onChange={(evt) =>
                            updateSceneEvent(index, { chance: Number.parseFloat(evt.target.value || "0") })
                          }
                          className={`admin-input ${toNumberError(event.chance, 0, 1, "Chance") ? INVALID_INPUT_CLASS : ""}`}
                        />
                        {toNumberError(event.chance, 0, 1, "Chance") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(event.chance, 0, 1, "Chance")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Money Delta</p>
                        <input
                          type="number"
                          min={-500}
                          max={500}
                          step={1}
                          value={event.moneyDelta}
                          onChange={(evt) =>
                            updateSceneEvent(index, { moneyDelta: Number.parseInt(evt.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(event.moneyDelta, -500, 500, "Money Delta") ? INVALID_INPUT_CLASS : ""}`}
                        />
                        {toNumberError(event.moneyDelta, -500, 500, "Money Delta") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(event.moneyDelta, -500, 500, "Money Delta")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Fame Delta</p>
                        <input
                          type="number"
                          min={-20}
                          max={20}
                          step={1}
                          value={event.fameDelta}
                          onChange={(evt) =>
                            updateSceneEvent(index, { fameDelta: Number.parseInt(evt.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(event.fameDelta, -20, 20, "Fame Delta") ? INVALID_INPUT_CLASS : ""}`}
                        />
                        {toNumberError(event.fameDelta, -20, 20, "Fame Delta") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(event.fameDelta, -20, 20, "Fame Delta")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Scene Cred Delta</p>
                        <input
                          type="number"
                          min={-20}
                          max={20}
                          step={1}
                          value={event.sceneCredDelta}
                          onChange={(evt) =>
                            updateSceneEvent(index, { sceneCredDelta: Number.parseInt(evt.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(event.sceneCredDelta, -20, 20, "Scene Cred Delta") ? INVALID_INPUT_CLASS : ""}`}
                        />
                        {toNumberError(event.sceneCredDelta, -20, 20, "Scene Cred Delta") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(event.sceneCredDelta, -20, 20, "Scene Cred Delta")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Fan Trust Delta</p>
                        <input
                          type="number"
                          min={-20}
                          max={20}
                          step={1}
                          value={event.fanTrustDelta}
                          onChange={(evt) =>
                            updateSceneEvent(index, { fanTrustDelta: Number.parseInt(evt.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(event.fanTrustDelta, -20, 20, "Fan Trust Delta") ? INVALID_INPUT_CLASS : ""}`}
                        />
                        {toNumberError(event.fanTrustDelta, -20, 20, "Fan Trust Delta") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(event.fanTrustDelta, -20, 20, "Fan Trust Delta")}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="track-title">Promo Packages</h2>
                <p className="track-meta">{design.promoPackages.length} promo packages configured.</p>
                <p className="track-meta">Set spending options and attendance boosts.</p>
              </div>
              <button type="button" className="admin-btn" onClick={addPromo}>
                Add Promo
              </button>
            </div>

            <div className="admin-grid mt-4">
              {design.promoPackages.map((promo, index) => (
                <article key={`promo-${index}`} className="admin-card">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="track-title">{promo.label || `Promo ${index + 1}`}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => movePromo(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => movePromo(index, 1)}
                        disabled={index === design.promoPackages.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => duplicatePromo(index)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          const label = promo.label || `Promo ${index + 1}`;
                          if (window.confirm(`Remove ${label}?`)) {
                            removePromo(index);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    <p className="track-meta">Identity</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="track-meta mb-1">Promo Name</p>
                        <input
                          value={promo.label}
                          onChange={(event) => {
                            const nextLabel = event.target.value;
                            updatePromo(index, {
                              label: nextLabel,
                              id: toSlug(nextLabel, `promo-${index + 1}`),
                            });
                          }}
                          className="admin-input"
                          placeholder="Promo label"
                        />
                      </div>

                      <div>
                        <p className="track-meta mb-1">Promo ID</p>
                        <input
                          value={promo.id}
                          onChange={(event) => updatePromo(index, { id: event.target.value })}
                          className="admin-input"
                          placeholder="Promo id"
                        />
                        <p className="track-meta mt-1">Used internally by game data.</p>
                      </div>
                    </div>

                    <p className="track-meta">Promo Effect</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="track-meta mb-1">Cost</p>
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          step={1}
                          value={promo.cost}
                          onChange={(event) =>
                            updatePromo(index, { cost: Number.parseInt(event.target.value || "0", 10) })
                          }
                          className={`admin-input ${toNumberError(promo.cost, 0, 1000, "Cost") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Cost"
                        />
                        <p className="track-meta mt-1">Marketing spend for this package. Range: 0-1000</p>
                        {toNumberError(promo.cost, 0, 1000, "Cost") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(promo.cost, 0, 1000, "Cost")}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="track-meta mb-1">Attendance Boost</p>
                        <input
                          type="number"
                          min={0}
                          max={0.8}
                          step="0.01"
                          value={promo.attendanceBoost}
                          onChange={(event) =>
                            updatePromo(index, {
                              attendanceBoost: Number.parseFloat(event.target.value || "0"),
                            })
                          }
                          className={`admin-input ${toNumberError(promo.attendanceBoost, 0, 0.8, "Attendance Boost") ? INVALID_INPUT_CLASS : ""}`}
                          placeholder="Attendance boost"
                        />
                        <p className="track-meta mt-1">Decimal lift to turnout (0.15 = +15%). Range: 0.00-0.80</p>
                        {toNumberError(promo.attendanceBoost, 0, 0.8, "Attendance Boost") ? (
                          <p className="track-meta mt-1 text-red-700">{toNumberError(promo.attendanceBoost, 0, 0.8, "Attendance Boost")}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
