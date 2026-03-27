"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type AdventureEffects = {
  budget: number;
  hype: number;
  chaos: number;
};

type AdventureDifficulty = {
  minProblemRounds: number;
  maxProblemRounds: number;
  basePressureMultiplier: number;
  pressureStepPerRound: number;
  maxPressureMultiplier: number;
  hypeBonusThreshold: number;
  chaosBonusThreshold: number;
};

type AdventureVenue = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

type AdventureBand = {
  id: string;
  name: string;
  genre: string;
  description: string;
  image: string;
  caption: string;
  specialEvent: string;
  effects: AdventureEffects;
  enabled: boolean;
};

type AdventureStageDesign = {
  id: string;
  name: string;
  description: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

type AdventurePromotion = {
  id: string;
  name: string;
  description: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

type AdventureExtraStageOption = {
  id: string;
  name: string;
  description: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

type AdventureExtraStage = {
  id: string;
  title: string;
  prompt: string;
  description: string;
  enabled: boolean;
  options: AdventureExtraStageOption[];
};

type AdventureProblemChoice = {
  id: string;
  text: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
};

type AdventureProblemEvent = {
  id: string;
  title: string;
  description: string;
  image: string;
  caption: string;
  enabled: boolean;
  choices: AdventureProblemChoice[];
};

type AdventureEnding = {
  id: string;
  title: string;
  summary: string;
  image: string;
  caption: string;
  minHype: number;
  maxHype: number;
  minChaos: number;
  maxChaos: number;
  minBudget: number;
  maxBudget: number;
  priority: number;
};

type AdventureDesign = {
  gameTitle: string;
  cityName: string;
  introLine: string;
  introImage: string;
  introCaption: string;
  startingBudget: number;
  startingHype: number;
  startingChaos: number;
  difficulty: AdventureDifficulty;
  venues: AdventureVenue[];
  bands: AdventureBand[];
  stageDesigns: AdventureStageDesign[];
  promotionMethods: AdventurePromotion[];
  extraStages: AdventureExtraStage[];
  problemEvents: AdventureProblemEvent[];
  endings: AdventureEnding[];
};

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;

const DEFAULT_TEMPLATE: AdventureDesign = {
  gameTitle: "George Street Promoter Adventure",
  cityName: "St. John's",
  introLine:
    "You are a local promoter trying to run a hit concert. Make smart choices, survive absurd problems, and maybe become legend.",
  introImage: "",
  introCaption: "A clipboard, a budget, and unstoppable confidence.",
  startingBudget: 50,
  startingHype: 0,
  startingChaos: 0,
  difficulty: {
    minProblemRounds: 2,
    maxProblemRounds: 5,
    basePressureMultiplier: 1,
    pressureStepPerRound: 0.2,
    maxPressureMultiplier: 2,
    hypeBonusThreshold: 60,
    chaosBonusThreshold: 45,
  },
  venues: [
    {
      id: "downtown-dive-bar",
      name: "Downtown Dive Bar",
      description: "Sticky floors but legendary shows.",
      capacity: 120,
      image: "",
      caption: "The house lights flicker with possibility.",
      effects: { budget: 20, hype: -5, chaos: 10 },
      enabled: true,
    },
  ],
  bands: [
    {
      id: "screech-owls",
      name: "The Screech Owls",
      genre: "punk",
      description: "Fast, loud, and unpredictable.",
      image: "",
      caption: "The crowd starts jumping before song one.",
      specialEvent: "stageDiveDemand",
      effects: { budget: 0, hype: 25, chaos: 20 },
      enabled: true,
    },
    {
      id: "signal-hill-sonics",
      name: "Signal Hill Sonics",
      genre: "rock",
      description: "Big hooks and bigger amps.",
      image: "",
      caption: "You can feel the bass in your ribs.",
      specialEvent: "",
      effects: { budget: -4, hype: 20, chaos: 8 },
      enabled: true,
    },
  ],
  stageDesigns: [
    {
      id: "simple-lights",
      name: "Simple Lights",
      description: "Clean setup and low risk.",
      image: "",
      caption: "The stage is humble but sharp.",
      effects: { budget: -5, hype: 5, chaos: 0 },
      enabled: true,
    },
    {
      id: "fog-machine-madness",
      name: "Fog Machine Madness",
      description: "Moody and dramatic, possibly too dramatic.",
      image: "",
      caption: "Visibility drops, hype rises.",
      effects: { budget: -10, hype: 15, chaos: 20 },
      enabled: true,
    },
  ],
  promotionMethods: [
    {
      id: "posters-downtown",
      name: "Posters Downtown",
      description: "Classic paper and tape campaign.",
      image: "",
      caption: "Every lamp post becomes your marketing team.",
      effects: { budget: -5, hype: 10, chaos: 5 },
      enabled: true,
    },
    {
      id: "social-media-blitz",
      name: "Social Media Blitz",
      description: "Clips, stories, memes, and no sleep.",
      image: "",
      caption: "Mentions spike by lunchtime.",
      effects: { budget: -10, hype: 25, chaos: 5 },
      enabled: true,
    },
  ],
  extraStages: [
    {
      id: "extra-merch-plan",
      title: "Merch Table Strategy",
      prompt: "How do you run merch tonight?",
      description: "An optional branch stage between promotion and crisis.",
      enabled: true,
      options: [
        {
          id: "merch-basic",
          name: "Basic Table",
          description: "Simple setup and quick cash.",
          image: "",
          caption: "Fans line up politely and buy stickers.",
          effects: { budget: 8, hype: 3, chaos: -1 },
          enabled: true,
        },
        {
          id: "merch-wild",
          name: "Limited Drop Frenzy",
          description: "Huge demand, huge scramble.",
          image: "",
          caption: "The line wraps around the bar before doors.",
          effects: { budget: 14, hype: 10, chaos: 9 },
          enabled: true,
        },
      ],
    },
  ],
  problemEvents: [
    {
      id: "band-van-breakdown",
      title: "Band Van Breakdown",
      description: "The band van breaks down outside Clarenville.",
      image: "",
      caption: "The group chat becomes urgent immediately.",
      enabled: true,
      choices: [
        {
          id: "delay-show",
          text: "Delay the show",
          image: "",
          caption: "You announce a delay with maximum confidence.",
          effects: { budget: 0, hype: -10, chaos: 10 },
        },
        {
          id: "replacement-band",
          text: "Find a replacement band",
          image: "",
          caption: "A local opener is suddenly a headliner.",
          effects: { budget: 0, hype: 5, chaos: 20 },
        },
        {
          id: "offer-free-drinks",
          text: "Offer free drinks",
          image: "",
          caption: "Crowd mood improves. Spreadsheet mood declines.",
          effects: { budget: -15, hype: 10, chaos: 0 },
        },
      ],
    },
  ],
  endings: [
    {
      id: "legendary-success",
      title: "Legendary Success",
      summary:
        "Your show at {venueName} featuring {bandNames} becomes legendary. People talk about it for years.",
      image: "",
      caption: "You are now booked out three months in advance.",
      minHype: 80,
      maxHype: 999,
      minChaos: -999,
      maxChaos: 39,
      minBudget: -999,
      maxBudget: 999,
      priority: 1,
    },
    {
      id: "great-show",
      title: "Great Show",
      summary: "You pull off a strong night and the city wants your next event.",
      image: "",
      caption: "A clear win and a lot of happy fans.",
      minHype: 50,
      maxHype: 999,
      minChaos: -999,
      maxChaos: 59,
      minBudget: -999,
      maxBudget: 999,
      priority: 2,
    },
    {
      id: "total-disaster",
      title: "Total Disaster",
      summary: "The fog machine triggers the alarm, and chaos becomes the headliner.",
      image: "",
      caption: "Nobody will forget this. For mixed reasons.",
      minHype: -999,
      maxHype: 999,
      minChaos: 80,
      maxChaos: 999,
      minBudget: -999,
      maxBudget: 999,
      priority: 3,
    },
    {
      id: "nobody-shows-up",
      title: "Nobody Shows Up",
      summary: "You booked everything except an audience.",
      image: "",
      caption: "The sound tech politely claps anyway.",
      minHype: -999,
      maxHype: 19,
      minChaos: -999,
      maxChaos: 999,
      minBudget: -999,
      maxBudget: 999,
      priority: 4,
    },
    {
      id: "chaotic-but-fun",
      title: "Chaotic But Fun",
      summary: "Messy, loud, and weirdly successful. You call it a classic.",
      image: "",
      caption: "Somehow, this worked.",
      minHype: -999,
      maxHype: 999,
      minChaos: -999,
      maxChaos: 999,
      minBudget: -999,
      maxBudget: 999,
      priority: 99,
    },
  ],
};

type DifficultyPresetKey = "easy" | "normal" | "chaos";

const DIFFICULTY_PRESETS: Record<DifficultyPresetKey, AdventureDifficulty> = {
  easy: {
    minProblemRounds: 1,
    maxProblemRounds: 3,
    basePressureMultiplier: 0.9,
    pressureStepPerRound: 0.12,
    maxPressureMultiplier: 1.5,
    hypeBonusThreshold: 75,
    chaosBonusThreshold: 60,
  },
  normal: {
    minProblemRounds: 2,
    maxProblemRounds: 5,
    basePressureMultiplier: 1,
    pressureStepPerRound: 0.2,
    maxPressureMultiplier: 2,
    hypeBonusThreshold: 60,
    chaosBonusThreshold: 45,
  },
  chaos: {
    minProblemRounds: 3,
    maxProblemRounds: 7,
    basePressureMultiplier: 1.2,
    pressureStepPerRound: 0.28,
    maxPressureMultiplier: 3,
    hypeBonusThreshold: 45,
    chaosBonusThreshold: 30,
  },
};

function matchesDifficultyPreset(
  difficulty: AdventureDifficulty,
  preset: AdventureDifficulty,
): boolean {
  return (
    difficulty.minProblemRounds === preset.minProblemRounds &&
    difficulty.maxProblemRounds === preset.maxProblemRounds &&
    difficulty.basePressureMultiplier === preset.basePressureMultiplier &&
    difficulty.pressureStepPerRound === preset.pressureStepPerRound &&
    difficulty.maxPressureMultiplier === preset.maxPressureMultiplier &&
    difficulty.hypeBonusThreshold === preset.hypeBonusThreshold &&
    difficulty.chaosBonusThreshold === preset.chaosBonusThreshold
  );
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseSafeInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseSafeFloat(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function createStageDesign(index: number): AdventureStageDesign {
  return {
    id: `stage-${index + 1}`,
    name: `Stage Design ${index + 1}`,
    description: "",
    image: "",
    caption: "",
    effects: { budget: 0, hype: 0, chaos: 0 },
    enabled: true,
  };
}

function createPromotion(index: number): AdventurePromotion {
  return {
    id: `promo-${index + 1}`,
    name: `Promotion ${index + 1}`,
    description: "",
    image: "",
    caption: "",
    effects: { budget: 0, hype: 0, chaos: 0 },
    enabled: true,
  };
}

function createExtraStageOption(index: number): AdventureExtraStageOption {
  return {
    id: `extra-option-${index + 1}`,
    name: `Option ${index + 1}`,
    description: "",
    image: "",
    caption: "",
    effects: { budget: 0, hype: 0, chaos: 0 },
    enabled: true,
  };
}

function createExtraStage(index: number): AdventureExtraStage {
  return {
    id: `extra-stage-${index + 1}`,
    title: `Extra Stage ${index + 1}`,
    prompt: "Choose one option.",
    description: "",
    enabled: true,
    options: [createExtraStageOption(0), createExtraStageOption(1)],
  };
}

function createProblemChoice(index: number): AdventureProblemChoice {
  return {
    id: `choice-${index + 1}`,
    text: `Choice ${index + 1}`,
    image: "",
    caption: "",
    effects: { budget: 0, hype: 0, chaos: 0 },
  };
}

function createProblemEvent(index: number): AdventureProblemEvent {
  return {
    id: `problem-${index + 1}`,
    title: `Problem Event ${index + 1}`,
    description: "",
    image: "",
    caption: "",
    enabled: true,
    choices: [createProblemChoice(0), createProblemChoice(1)],
  };
}

function createEnding(index: number): AdventureEnding {
  return {
    id: `ending-${index + 1}`,
    title: `Ending ${index + 1}`,
    summary: "",
    image: "",
    caption: "",
    minHype: -999,
    maxHype: 999,
    minChaos: -999,
    maxChaos: 999,
    minBudget: -999,
    maxBudget: 999,
    priority: index + 1,
  };
}

function chooseTwoCount(count: number): number {
  if (count < 2) {
    return 0;
  }

  return Math.floor((count * (count - 1)) / 2);
}

type SectionKey =
  | "guided"
  | "core"
  | "venues"
  | "bands"
  | "stage"
  | "promo"
  | "extra"
  | "problems"
  | "endings"
  | "json";

type JourneyPathSelection = {
  bandId: string;
  venueId: string;
  stageDesignId: string;
  promotionMethodId: string;
  problemEventId: string;
  problemChoiceId: string;
  endingId: string;
};

function preferredNickEarleBandId(bands: AdventureBand[]): string {
  const preferred = bands.find((band) => band.name.toLowerCase().includes("nick earle"));
  return preferred?.id ?? bands[0]?.id ?? "";
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

export default function AdventureAdminPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [jsonText, setJsonText] = useState(() => stringifyJson(DEFAULT_TEMPLATE));
  const [designDraft, setDesignDraft] = useState<AdventureDesign>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [journeyPath, setJourneyPath] = useState<JourneyPathSelection>({
    bandId: "",
    venueId: "",
    stageDesignId: "",
    promotionMethodId: "",
    problemEventId: "",
    problemChoiceId: "",
    endingId: "",
  });
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const coreRef = useRef<HTMLElement | null>(null);
  const venuesRef = useRef<HTMLElement | null>(null);
  const bandsRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const promoRef = useRef<HTMLElement | null>(null);
  const extraRef = useRef<HTMLElement | null>(null);
  const problemsRef = useRef<HTMLElement | null>(null);
  const endingsRef = useRef<HTMLElement | null>(null);
  const jsonRef = useRef<HTMLElement | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    guided: false,
    core: false,
    venues: false,
    bands: false,
    stage: false,
    promo: false,
    extra: false,
    problems: false,
    endings: false,
    json: false,
  });

  const enabledVenues = designDraft.venues.filter((item) => item.enabled);
  const enabledBands = designDraft.bands.filter((item) => item.enabled);
  const enabledStageDesigns = designDraft.stageDesigns.filter((item) => item.enabled);
  const enabledPromotionMethods = designDraft.promotionMethods.filter((item) => item.enabled);
  const enabledProblemEvents = designDraft.problemEvents.filter(
    (item) => item.enabled && item.choices.length > 0,
  );
  const enabledExtraStages = designDraft.extraStages.filter((item) => item.enabled);
  const enabledVenueCount = enabledVenues.length;
  const enabledBandCount = enabledBands.length;
  const enabledStageCount = enabledStageDesigns.length;
  const enabledPromoCount = enabledPromotionMethods.length;
  const enabledExtraStageCount = enabledExtraStages.length;
  const extraStageBranchMultiplier = enabledExtraStages.reduce((acc, stage) => {
    const optionCount = stage.options.filter((option) => option.enabled).length;
    return acc * Math.max(1, optionCount);
  }, 1);
  const enabledProblemCount = enabledProblemEvents.length;
  const validEndingCount = designDraft.endings.length;
  const estimatedPathCount =
    enabledVenueCount *
    chooseTwoCount(enabledBandCount) *
    Math.max(1, enabledStageCount) *
    Math.max(1, enabledPromoCount) *
    Math.max(1, extraStageBranchMultiplier) *
    Math.max(1, enabledProblemCount);

  const activeDifficultyPreset = (Object.keys(DIFFICULTY_PRESETS) as DifficultyPresetKey[]).find(
    (key) => matchesDifficultyPreset(designDraft.difficulty, DIFFICULTY_PRESETS[key]),
  );

  const selectedJourneyBand = designDraft.bands.find((band) => band.id === journeyPath.bandId) ?? null;
  const selectedJourneyVenue = designDraft.venues.find((venue) => venue.id === journeyPath.venueId) ?? null;
  const selectedJourneyStageDesign =
    designDraft.stageDesigns.find((item) => item.id === journeyPath.stageDesignId) ?? null;
  const selectedJourneyPromotion =
    designDraft.promotionMethods.find((item) => item.id === journeyPath.promotionMethodId) ?? null;
  const selectedJourneyProblemEvent =
    designDraft.problemEvents.find((item) => item.id === journeyPath.problemEventId) ?? null;
  const selectedJourneyProblemChoice =
    selectedJourneyProblemEvent?.choices.find((choice) => choice.id === journeyPath.problemChoiceId) ?? null;
  const selectedJourneyEnding =
    designDraft.endings.find((ending) => ending.id === journeyPath.endingId) ?? null;

  const journeyBudgetPreview =
    designDraft.startingBudget +
    (selectedJourneyBand?.effects.budget ?? 0) +
    (selectedJourneyVenue?.effects.budget ?? 0) +
    (selectedJourneyStageDesign?.effects.budget ?? 0) +
    (selectedJourneyPromotion?.effects.budget ?? 0) +
    (selectedJourneyProblemChoice?.effects.budget ?? 0);
  const journeyHypePreview =
    designDraft.startingHype +
    (selectedJourneyBand?.effects.hype ?? 0) +
    (selectedJourneyVenue?.effects.hype ?? 0) +
    (selectedJourneyStageDesign?.effects.hype ?? 0) +
    (selectedJourneyPromotion?.effects.hype ?? 0) +
    (selectedJourneyProblemChoice?.effects.hype ?? 0);
  const journeyChaosPreview =
    designDraft.startingChaos +
    (selectedJourneyBand?.effects.chaos ?? 0) +
    (selectedJourneyVenue?.effects.chaos ?? 0) +
    (selectedJourneyStageDesign?.effects.chaos ?? 0) +
    (selectedJourneyPromotion?.effects.chaos ?? 0) +
    (selectedJourneyProblemChoice?.effects.chaos ?? 0);
  const journeyEndingSummaryPreview = (selectedJourneyEnding?.summary ?? "")
    .replaceAll("{venueName}", selectedJourneyVenue?.name ?? "your venue")
    .replaceAll("{bandNames}", selectedJourneyBand?.name ?? "your main band")
    .replaceAll("{cityName}", designDraft.cityName);

  function scrollToSection(ref: { current: HTMLElement | null }) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleSection(section: SectionKey) {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function applyDifficultyPreset(presetKey: DifficultyPresetKey) {
    const preset = DIFFICULTY_PRESETS[presetKey];
    updateDesign((prev) => ({
      ...prev,
      difficulty: { ...preset },
    }));
    setMessage(`Applied ${presetKey.toUpperCase()} difficulty preset.`);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_secret");
    if (saved) {
      setAdminSecret(saved);

      void (async () => {
        try {
          const response = await fetch("/api/admin/adventure/design", {
            headers: {
              "x-admin-secret": saved.trim(),
            },
          });

          const body = (await response.json()) as { design?: AdventureDesign };
          if (!response.ok || !body.design) {
            return;
          }

          setDesignDraft(body.design);
          setJsonText(stringifyJson(body.design));
        } catch {
          // Keep existing UI state if autoload fails.
        }
      })();
    }
  }, []);

  useEffect(() => {
    setJourneyPath((prev) => {
      const bandId = enabledBands.some((band) => band.id === prev.bandId)
        ? prev.bandId
        : preferredNickEarleBandId(enabledBands);
      const venueId = enabledVenues.some((venue) => venue.id === prev.venueId)
        ? prev.venueId
        : (enabledVenues[0]?.id ?? "");
      const stageDesignId = enabledStageDesigns.some((item) => item.id === prev.stageDesignId)
        ? prev.stageDesignId
        : (enabledStageDesigns[0]?.id ?? "");
      const promotionMethodId = enabledPromotionMethods.some(
        (item) => item.id === prev.promotionMethodId,
      )
        ? prev.promotionMethodId
        : (enabledPromotionMethods[0]?.id ?? "");
      const problemEventId = enabledProblemEvents.some((item) => item.id === prev.problemEventId)
        ? prev.problemEventId
        : (enabledProblemEvents[0]?.id ?? "");
      const selectedProblem = enabledProblemEvents.find((item) => item.id === problemEventId);
      const problemChoiceId = selectedProblem?.choices.some((choice) => choice.id === prev.problemChoiceId)
        ? prev.problemChoiceId
        : (selectedProblem?.choices[0]?.id ?? "");
      const endingId = designDraft.endings.some((item) => item.id === prev.endingId)
        ? prev.endingId
        : (designDraft.endings[0]?.id ?? "");

      if (
        bandId === prev.bandId &&
        venueId === prev.venueId &&
        stageDesignId === prev.stageDesignId &&
        promotionMethodId === prev.promotionMethodId &&
        problemEventId === prev.problemEventId &&
        problemChoiceId === prev.problemChoiceId &&
        endingId === prev.endingId
      ) {
        return prev;
      }

      return {
        bandId,
        venueId,
        stageDesignId,
        promotionMethodId,
        problemEventId,
        problemChoiceId,
        endingId,
      };
    });
  }, [
    designDraft.endings,
    enabledBands,
    enabledProblemEvents,
    enabledPromotionMethods,
    enabledStageDesigns,
    enabledVenues,
  ]);

  function updateDesign(updater: (prev: AdventureDesign) => AdventureDesign) {
    setDesignDraft((prev) => {
      const next = updater(prev);
      setJsonText(stringifyJson(next));
      return next;
    });
  }

  function exportDesignToFile() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `adventure-design-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage("Adventure JSON exported.");
  }

  function triggerJsonImport() {
    jsonImportInputRef.current?.click();
  }

  async function handleJsonFileImport(file: File | null) {
    if (!file) {
      return;
    }

    setMessage("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AdventureDesign;
      setDesignDraft(parsed);
      setJsonText(stringifyJson(parsed));
      setMessage("Adventure JSON imported into visual editor.");
    } catch {
      setMessage("Could not import JSON file. Check format and try again.");
    }
  }

  async function handleImageUpload(
    file: File | null,
    apply: (dataUrl: string) => void,
  ) {
    if (!file) {
      return;
    }

    setMessage("");

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
      }

      if (file.size > MAX_UPLOAD_INPUT_BYTES) {
        throw new Error("Image too large. Keep input files under 5MB.");
      }

      const dataUrl = await compressImageFile(file);
      apply(dataUrl);
      setMessage("Image loaded into the designer. Save Design to persist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }

  function applyJsonToVisualEditor() {
    setMessage("");

    try {
      const parsed = JSON.parse(jsonText) as AdventureDesign;
      setDesignDraft(parsed);
      setMessage("JSON applied to visual editor.");
    } catch {
      setMessage("JSON is invalid. Fix syntax and try again.");
    }
  }

  async function loadDesign(event?: FormEvent) {
    event?.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (!adminSecret.trim()) {
        throw new Error("Enter admin secret first.");
      }

      window.localStorage.setItem("admin_secret", adminSecret.trim());

      const response = await fetch("/api/admin/adventure/design", {
        headers: {
          "x-admin-secret": adminSecret.trim(),
        },
      });

      const body = (await response.json()) as { design?: unknown; error?: string };
      if (!response.ok || !body.design) {
        throw new Error(body.error || "Failed to load adventure design.");
      }

      const design = body.design as AdventureDesign;
      setDesignDraft(design);
      setJsonText(stringifyJson(design));
      setMessage("Adventure design loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function saveDesign() {
    setMessage("");
    setSaving(true);

    try {
      if (!adminSecret.trim()) {
        throw new Error("Enter admin secret first.");
      }

      window.localStorage.setItem("admin_secret", adminSecret.trim());

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error("JSON is invalid. Fix syntax and try again.");
      }

      const response = await fetch("/api/admin/adventure/design", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret.trim(),
        },
        body: JSON.stringify({ design: parsed }),
      });

      const body = (await response.json()) as { design?: unknown; error?: string };
      if (!response.ok || !body.design) {
        throw new Error(body.error || "Failed to save adventure design.");
      }

      const design = body.design as AdventureDesign;
      setDesignDraft(design);
      setJsonText(stringifyJson(design));
      setMessage("Adventure design saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function resetToTemplate() {
    setDesignDraft(DEFAULT_TEMPLATE);
    setJsonText(stringifyJson(DEFAULT_TEMPLATE));
    setMessage("Template loaded in visual editor. Save to apply.");
  }

  return (
    <div className="comic-bg min-h-screen px-4 py-8 text-black sm:px-8">
      <main className="mx-auto max-w-6xl">
        <section className="paper-panel space-y-5">
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="weekly-back-btn inline-block">
              ← Admin Home
            </Link>
            <Link href="/game/adventure" className="weekly-back-btn inline-block">
              Open Adventure Game
            </Link>
          </div>

          <div>
            <h1 className="panel-title">Adventure Game Designer</h1>
            <p className="week-meta mt-1">
              Build your adventure with visual controls, image uploads, and optional raw JSON editing.
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
            <button type="button" className="admin-btn" onClick={resetToTemplate}>
              Load Template
            </button>
            <button type="button" className="admin-btn" onClick={applyJsonToVisualEditor}>
              Apply JSON To Visual Editor
            </button>
            <button type="button" className="admin-btn" onClick={exportDesignToFile}>
              Export JSON File
            </button>
            <button type="button" className="admin-btn" onClick={triggerJsonImport}>
              Import JSON File
            </button>
          </form>

          <input
            ref={jsonImportInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void handleJsonFileImport(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          {message ? <p className="admin-message">{message}</p> : null}

          <style jsx>{`
            article[data-collapsed="true"] > :not(:first-child) {
              display: none;
            }
          `}</style>

          <article className="admin-card space-y-4" data-collapsed={!openSections.guided}>
            <div className="admin-row">
              <h2 className="track-title">Guided Branch Builder</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("guided")}>
                {openSections.guided ? "Collapse" : "Expand"}
              </button>
            </div>
            <p className="track-meta">
              Build in this order: Venue to Bands (pick 2) to Stage to Promotion to Extra Stages to Problem to Ending.
              Use the jump buttons to move through each branch step quickly.
            </p>

            <div className="grid gap-2 sm:grid-cols-4">
              <button type="button" className="admin-btn" onClick={() => scrollToSection(coreRef)}>1) Core</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(venuesRef)}>2) Venues</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(bandsRef)}>3) Bands</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(stageRef)}>4) Stage</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(promoRef)}>5) Promotion</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(extraRef)}>6) Extra Stages</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(problemsRef)}>7) Problems</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(endingsRef)}>8) Endings</button>
              <button type="button" className="admin-btn" onClick={() => scrollToSection(jsonRef)}>JSON</button>
            </div>

            <div className="rounded border-2 border-black bg-yellow-100 p-3 text-sm">
              <p><strong>Enabled Branch Counts</strong></p>
              <p>Venues: {enabledVenueCount}</p>
              <p>Bands: {enabledBandCount} (must be 2+)</p>
              <p>Stage Designs: {enabledStageCount}</p>
              <p>Promotion Methods: {enabledPromoCount}</p>
              <p>Extra Stages: {enabledExtraStageCount}</p>
              <p>Problem Events: {enabledProblemCount}</p>
              <p>Endings: {validEndingCount}</p>
              <p>Estimated Branch Paths: {estimatedPathCount}</p>
            </div>

            <div className="rounded border-2 border-black bg-white p-3 text-sm">
              <p><strong>Readiness Check</strong></p>
              <p>{enabledVenueCount > 0 ? "OK" : "Add at least one enabled venue."}</p>
              <p>{enabledBandCount >= 2 ? "OK" : "Add at least two enabled bands."}</p>
              <p>{enabledStageCount > 0 ? "OK" : "Add at least one enabled stage design."}</p>
              <p>{enabledPromoCount > 0 ? "OK" : "Add at least one enabled promotion method."}</p>
              <p>
                {enabledExtraStageCount === 0
                  ? "Optional: add extra stages for deeper branching."
                  : "OK"}
              </p>
              <p>{enabledProblemCount > 0 ? "OK" : "Add at least one enabled problem event."}</p>
              <p>{validEndingCount > 0 ? "OK" : "Add at least one ending."}</p>
            </div>

            <div className="rounded border-2 border-black bg-blue-50 p-3 text-sm">
              <p><strong>Single Journey Path Designer</strong></p>
              <p className="mt-1">
                Nick Earle is auto-selected when available. Choose one branch at each step and edit that step&apos;s story text directly.
              </p>

              <div className="admin-grid mt-3">
                <div>
                  <label className="track-meta">1) Main Band</label>
                  <select
                    className="admin-input"
                    value={journeyPath.bandId}
                    onChange={(event) => setJourneyPath((prev) => ({ ...prev, bandId: event.target.value }))}
                  >
                    {enabledBands.map((band) => (
                      <option key={band.id} value={band.id}>{band.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="track-meta">2) Venue</label>
                  <select
                    className="admin-input"
                    value={journeyPath.venueId}
                    onChange={(event) => setJourneyPath((prev) => ({ ...prev, venueId: event.target.value }))}
                  >
                    {enabledVenues.map((venue) => (
                      <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="track-meta">3) Stage Design</label>
                  <select
                    className="admin-input"
                    value={journeyPath.stageDesignId}
                    onChange={(event) => setJourneyPath((prev) => ({ ...prev, stageDesignId: event.target.value }))}
                  >
                    {enabledStageDesigns.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="track-meta">4) Promotion</label>
                  <select
                    className="admin-input"
                    value={journeyPath.promotionMethodId}
                    onChange={(event) => setJourneyPath((prev) => ({ ...prev, promotionMethodId: event.target.value }))}
                  >
                    {enabledPromotionMethods.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="track-meta">5) Problem Event</label>
                  <select
                    className="admin-input"
                    value={journeyPath.problemEventId}
                    onChange={(event) => {
                      const nextEventId = event.target.value;
                      const nextEvent = enabledProblemEvents.find((item) => item.id === nextEventId);
                      setJourneyPath((prev) => ({
                        ...prev,
                        problemEventId: nextEventId,
                        problemChoiceId: nextEvent?.choices[0]?.id ?? "",
                      }));
                    }}
                  >
                    {enabledProblemEvents.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="track-meta">6) Problem Choice</label>
                  <select
                    className="admin-input"
                    value={journeyPath.problemChoiceId}
                    onChange={(event) => setJourneyPath((prev) => ({ ...prev, problemChoiceId: event.target.value }))}
                    disabled={!selectedJourneyProblemEvent}
                  >
                    {(selectedJourneyProblemEvent?.choices ?? []).map((choice) => (
                      <option key={choice.id} value={choice.id}>{choice.text}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="track-meta">7) Ending</label>
                  <select
                    className="admin-input"
                    value={journeyPath.endingId}
                    onChange={(event) => setJourneyPath((prev) => ({ ...prev, endingId: event.target.value }))}
                  >
                    {designDraft.endings.map((ending) => (
                      <option key={ending.id} value={ending.id}>{ending.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 rounded border border-black bg-white p-2">
                <p className="font-bold uppercase">Path Preview</p>
                <p className="mt-1">
                  {selectedJourneyBand?.name ?? "Band"}
                  {" -> "}
                  {selectedJourneyVenue?.name ?? "Venue"}
                  {" -> "}
                  {selectedJourneyStageDesign?.name ?? "Stage"}
                  {" -> "}
                  {selectedJourneyPromotion?.name ?? "Promotion"}
                  {" -> "}
                  {selectedJourneyProblemEvent?.title ?? "Problem"}
                  {" -> "}
                  {selectedJourneyProblemChoice?.text ?? "Choice"}
                  {" -> "}
                  {selectedJourneyEnding?.title ?? "Ending"}
                </p>
              </div>

              <div className="mt-3 rounded border border-black bg-zinc-100 p-3">
                <p className="font-bold uppercase">Mobile Preview</p>
                <p className="track-meta mt-1">Live phone-size mockup for this exact selected path.</p>
                <div className="mt-3 flex justify-center">
                  <div className="w-[260px] rounded-[28px] border-4 border-black bg-black p-2 shadow-[6px_6px_0_#000]">
                    <div className="rounded-[20px] border-2 border-black bg-white p-3">
                      <div className="mb-2 rounded border border-black bg-yellow-100 px-2 py-1 text-[10px] font-bold uppercase">
                        {designDraft.gameTitle}
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-bold uppercase">
                        <div className="rounded border border-black bg-green-100 p-1 text-center">
                          ${journeyBudgetPreview}
                        </div>
                        <div className="rounded border border-black bg-orange-100 p-1 text-center">
                          H {journeyHypePreview}
                        </div>
                        <div className="rounded border border-black bg-red-100 p-1 text-center">
                          C {journeyChaosPreview}
                        </div>
                      </div>

                      <div className="mt-2 space-y-2 text-[11px]">
                        <div className="rounded border border-black p-2">
                          <p className="font-bold uppercase">1) Main Band</p>
                          <p>{selectedJourneyBand?.name ?? "Select band"}</p>
                          <p className="text-[10px]">{selectedJourneyBand?.caption ?? ""}</p>
                        </div>
                        <div className="rounded border border-black p-2">
                          <p className="font-bold uppercase">2) Venue</p>
                          <p>{selectedJourneyVenue?.name ?? "Select venue"}</p>
                          <p className="text-[10px]">{selectedJourneyVenue?.caption ?? ""}</p>
                        </div>
                        <div className="rounded border border-black p-2">
                          <p className="font-bold uppercase">3) Stage / Promo</p>
                          <p>{selectedJourneyStageDesign?.name ?? "Stage"}</p>
                          <p>{selectedJourneyPromotion?.name ?? "Promotion"}</p>
                        </div>
                        <div className="rounded border border-black p-2">
                          <p className="font-bold uppercase">4) Crisis</p>
                          <p>{selectedJourneyProblemEvent?.title ?? "Select problem"}</p>
                          <p className="text-[10px]">Choice: {selectedJourneyProblemChoice?.text ?? "Select choice"}</p>
                          <p className="text-[10px] font-bold uppercase">
                            B {formatSigned(selectedJourneyProblemChoice?.effects.budget ?? 0)} | H {formatSigned(selectedJourneyProblemChoice?.effects.hype ?? 0)} | C {formatSigned(selectedJourneyProblemChoice?.effects.chaos ?? 0)}
                          </p>
                        </div>
                        <div className="rounded border border-black bg-sky-50 p-2">
                          <p className="font-bold uppercase">5) Ending</p>
                          <p>{selectedJourneyEnding?.title ?? "Select ending"}</p>
                          <p className="text-[10px]">{journeyEndingSummaryPreview || "Ending summary preview appears here."}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedJourneyBand ? (
                <div className="mt-3 rounded border border-black bg-white p-2">
                  <p className="font-bold uppercase">Band Text</p>
                  <input
                    className="admin-input mt-2"
                    value={selectedJourneyBand.name}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        bands: prev.bands.map((item) =>
                          item.id === selectedJourneyBand.id ? { ...item, name: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyBand.description}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        bands: prev.bands.map((item) =>
                          item.id === selectedJourneyBand.id ? { ...item, description: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyBand.caption}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        bands: prev.bands.map((item) =>
                          item.id === selectedJourneyBand.id ? { ...item, caption: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedJourneyVenue ? (
                <div className="mt-3 rounded border border-black bg-white p-2">
                  <p className="font-bold uppercase">Venue Text</p>
                  <input
                    className="admin-input mt-2"
                    value={selectedJourneyVenue.name}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        venues: prev.venues.map((item) =>
                          item.id === selectedJourneyVenue.id ? { ...item, name: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyVenue.description}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        venues: prev.venues.map((item) =>
                          item.id === selectedJourneyVenue.id
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyVenue.caption}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        venues: prev.venues.map((item) =>
                          item.id === selectedJourneyVenue.id ? { ...item, caption: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedJourneyStageDesign ? (
                <div className="mt-3 rounded border border-black bg-white p-2">
                  <p className="font-bold uppercase">Stage Text</p>
                  <input
                    className="admin-input mt-2"
                    value={selectedJourneyStageDesign.name}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        stageDesigns: prev.stageDesigns.map((item) =>
                          item.id === selectedJourneyStageDesign.id
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyStageDesign.description}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        stageDesigns: prev.stageDesigns.map((item) =>
                          item.id === selectedJourneyStageDesign.id
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyStageDesign.caption}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        stageDesigns: prev.stageDesigns.map((item) =>
                          item.id === selectedJourneyStageDesign.id
                            ? { ...item, caption: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedJourneyPromotion ? (
                <div className="mt-3 rounded border border-black bg-white p-2">
                  <p className="font-bold uppercase">Promotion Text</p>
                  <input
                    className="admin-input mt-2"
                    value={selectedJourneyPromotion.name}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        promotionMethods: prev.promotionMethods.map((item) =>
                          item.id === selectedJourneyPromotion.id
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyPromotion.description}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        promotionMethods: prev.promotionMethods.map((item) =>
                          item.id === selectedJourneyPromotion.id
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyPromotion.caption}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        promotionMethods: prev.promotionMethods.map((item) =>
                          item.id === selectedJourneyPromotion.id
                            ? { ...item, caption: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedJourneyProblemEvent ? (
                <div className="mt-3 rounded border border-black bg-white p-2">
                  <p className="font-bold uppercase">Problem Event Text</p>
                  <input
                    className="admin-input mt-2"
                    value={selectedJourneyProblemEvent.title}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((item) =>
                          item.id === selectedJourneyProblemEvent.id
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyProblemEvent.description}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((item) =>
                          item.id === selectedJourneyProblemEvent.id
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyProblemEvent.caption}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((item) =>
                          item.id === selectedJourneyProblemEvent.id
                            ? { ...item, caption: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedJourneyProblemEvent && selectedJourneyProblemChoice ? (
                <div className="mt-3 rounded border border-black bg-white p-2">
                  <p className="font-bold uppercase">Problem Choice Text</p>
                  <input
                    className="admin-input mt-2"
                    value={selectedJourneyProblemChoice.text}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((item) =>
                          item.id === selectedJourneyProblemEvent.id
                            ? {
                                ...item,
                                choices: item.choices.map((choice) =>
                                  choice.id === selectedJourneyProblemChoice.id
                                    ? { ...choice, text: event.target.value }
                                    : choice,
                                ),
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyProblemChoice.caption}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((item) =>
                          item.id === selectedJourneyProblemEvent.id
                            ? {
                                ...item,
                                choices: item.choices.map((choice) =>
                                  choice.id === selectedJourneyProblemChoice.id
                                    ? { ...choice, caption: event.target.value }
                                    : choice,
                                ),
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedJourneyEnding ? (
                <div className="mt-3 rounded border border-black bg-white p-2">
                  <p className="font-bold uppercase">Ending Text</p>
                  <input
                    className="admin-input mt-2"
                    value={selectedJourneyEnding.title}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        endings: prev.endings.map((item) =>
                          item.id === selectedJourneyEnding.id ? { ...item, title: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={3}
                    value={selectedJourneyEnding.summary}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        endings: prev.endings.map((item) =>
                          item.id === selectedJourneyEnding.id ? { ...item, summary: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={selectedJourneyEnding.caption}
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        endings: prev.endings.map((item) =>
                          item.id === selectedJourneyEnding.id ? { ...item, caption: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>
          </article>

          <article ref={coreRef} className="admin-card space-y-4" data-collapsed={!openSections.core}>
            <div className="admin-row">
              <h2 className="track-title">Core Settings</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("core")}>
                {openSections.core ? "Collapse" : "Expand"}
              </button>
            </div>
            <p className="track-meta">Set the overall tone and intro copy for your branching story.</p>
            <div className="rounded border-2 border-black bg-orange-50 p-3">
              <p className="track-meta font-bold">Difficulty Presets</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`admin-btn ${activeDifficultyPreset === "easy" ? "bg-green-200" : ""}`}
                  onClick={() => applyDifficultyPreset("easy")}
                >
                  Easy
                </button>
                <button
                  type="button"
                  className={`admin-btn ${activeDifficultyPreset === "normal" ? "bg-blue-200" : ""}`}
                  onClick={() => applyDifficultyPreset("normal")}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`admin-btn ${activeDifficultyPreset === "chaos" ? "bg-red-200" : ""}`}
                  onClick={() => applyDifficultyPreset("chaos")}
                >
                  Chaos
                </button>
              </div>
              <p className="track-meta mt-2">
                Active preset: {activeDifficultyPreset ? activeDifficultyPreset.toUpperCase() : "CUSTOM"}
              </p>
            </div>
            <div className="admin-grid">
              <div>
                <label className="track-meta">Game Title</label>
                <input
                  className="admin-input"
                  value={designDraft.gameTitle}
                  onChange={(event) =>
                    updateDesign((prev) => ({ ...prev, gameTitle: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">City Name</label>
                <input
                  className="admin-input"
                  value={designDraft.cityName}
                  onChange={(event) =>
                    updateDesign((prev) => ({ ...prev, cityName: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Starting Budget</label>
                <input
                  type="number"
                  className="admin-input"
                  value={designDraft.startingBudget}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      startingBudget: parseSafeInt(event.target.value, prev.startingBudget),
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Starting Hype</label>
                <input
                  type="number"
                  className="admin-input"
                  value={designDraft.startingHype}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      startingHype: parseSafeInt(event.target.value, prev.startingHype),
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Starting Chaos</label>
                <input
                  type="number"
                  className="admin-input"
                  value={designDraft.startingChaos}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      startingChaos: parseSafeInt(event.target.value, prev.startingChaos),
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Min Crisis Rounds</label>
                <input
                  type="number"
                  className="admin-input"
                  value={designDraft.difficulty.minProblemRounds}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      difficulty: {
                        ...prev.difficulty,
                        minProblemRounds: parseSafeInt(event.target.value, prev.difficulty.minProblemRounds),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Max Crisis Rounds</label>
                <input
                  type="number"
                  className="admin-input"
                  value={designDraft.difficulty.maxProblemRounds}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      difficulty: {
                        ...prev.difficulty,
                        maxProblemRounds: parseSafeInt(event.target.value, prev.difficulty.maxProblemRounds),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Base Pressure Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  value={designDraft.difficulty.basePressureMultiplier}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      difficulty: {
                        ...prev.difficulty,
                        basePressureMultiplier: parseSafeFloat(
                          event.target.value,
                          prev.difficulty.basePressureMultiplier,
                        ),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Pressure Step Per Round</label>
                <input
                  type="number"
                  step="0.05"
                  className="admin-input"
                  value={designDraft.difficulty.pressureStepPerRound}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      difficulty: {
                        ...prev.difficulty,
                        pressureStepPerRound: parseSafeFloat(
                          event.target.value,
                          prev.difficulty.pressureStepPerRound,
                        ),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Max Pressure Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  value={designDraft.difficulty.maxPressureMultiplier}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      difficulty: {
                        ...prev.difficulty,
                        maxPressureMultiplier: parseSafeFloat(
                          event.target.value,
                          prev.difficulty.maxPressureMultiplier,
                        ),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Hype Bonus Threshold</label>
                <input
                  type="number"
                  className="admin-input"
                  value={designDraft.difficulty.hypeBonusThreshold}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      difficulty: {
                        ...prev.difficulty,
                        hypeBonusThreshold: parseSafeInt(
                          event.target.value,
                          prev.difficulty.hypeBonusThreshold,
                        ),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Chaos Bonus Threshold</label>
                <input
                  type="number"
                  className="admin-input"
                  value={designDraft.difficulty.chaosBonusThreshold}
                  onChange={(event) =>
                    updateDesign((prev) => ({
                      ...prev,
                      difficulty: {
                        ...prev.difficulty,
                        chaosBonusThreshold: parseSafeInt(
                          event.target.value,
                          prev.difficulty.chaosBonusThreshold,
                        ),
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="track-meta">Intro Image URL/Data URL</label>
                <input
                  className="admin-input"
                  value={designDraft.introImage}
                  onChange={(event) =>
                    updateDesign((prev) => ({ ...prev, introImage: event.target.value }))
                  }
                />
                <input
                  type="file"
                  accept="image/*"
                  className="admin-input mt-2"
                  onChange={(event) =>
                    void handleImageUpload(event.target.files?.[0] ?? null, (dataUrl) =>
                      updateDesign((prev) => ({ ...prev, introImage: dataUrl })),
                    )
                  }
                />
              </div>
            </div>
            <div>
              <label className="track-meta">Intro Line</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={designDraft.introLine}
                onChange={(event) =>
                  updateDesign((prev) => ({ ...prev, introLine: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="track-meta">Intro Caption</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={designDraft.introCaption}
                onChange={(event) =>
                  updateDesign((prev) => ({ ...prev, introCaption: event.target.value }))
                }
              />
            </div>
          </article>

          <article ref={venuesRef} className="admin-card space-y-4" data-collapsed={!openSections.venues}>
            <div className="admin-row">
              <h2 className="track-title">Venues</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("venues")}>
                {openSections.venues ? "Collapse" : "Expand"}
              </button>
            </div>
            <p className="track-meta">
              Branch 1. Venues are synced from the original booking spreadsheet source. Use checkboxes and copy/effects fields for adventure behavior.
            </p>
            <div className="space-y-4">
              {designDraft.venues.map((venue, index) => (
                <div key={`${venue.id}-${index}`} className="rounded border-2 border-black p-3">
                  <div className="admin-row">
                    <p className="font-bold uppercase">Venue {index + 1}</p>
                  </div>
                  <div className="admin-grid mt-3">
                    <input
                      className="admin-input"
                      value={venue.id}
                      placeholder="id"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          venues: prev.venues.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, id: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      className="admin-input"
                      value={venue.name}
                      placeholder="name"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          venues: prev.venues.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={venue.capacity}
                      placeholder="capacity"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          venues: prev.venues.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  capacity: parseSafeInt(event.target.value, item.capacity),
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                    <label className="track-meta flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={venue.enabled}
                        onChange={(event) =>
                          updateDesign((prev) => ({
                            ...prev,
                            venues: prev.venues.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, enabled: event.target.checked } : item,
                            ),
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={venue.description}
                    placeholder="description"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        venues: prev.venues.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, description: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <input
                    className="admin-input mt-2"
                    value={venue.image}
                    placeholder="image URL or data URL"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        venues: prev.venues.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, image: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="admin-input mt-2"
                    onChange={(event) =>
                      void handleImageUpload(event.target.files?.[0] ?? null, (dataUrl) =>
                        updateDesign((prev) => ({
                          ...prev,
                          venues: prev.venues.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, image: dataUrl } : item,
                          ),
                        })),
                      )
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={venue.caption}
                    placeholder="caption"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        venues: prev.venues.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, caption: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <div className="admin-grid mt-2">
                    <input
                      type="number"
                      className="admin-input"
                      value={venue.effects.budget}
                      placeholder="budget effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          venues: prev.venues.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  effects: {
                                    ...item.effects,
                                    budget: parseSafeInt(event.target.value, item.effects.budget),
                                  },
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={venue.effects.hype}
                      placeholder="hype effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          venues: prev.venues.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  effects: {
                                    ...item.effects,
                                    hype: parseSafeInt(event.target.value, item.effects.hype),
                                  },
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={venue.effects.chaos}
                      placeholder="chaos effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          venues: prev.venues.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  effects: {
                                    ...item.effects,
                                    chaos: parseSafeInt(event.target.value, item.effects.chaos),
                                  },
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article ref={bandsRef} className="admin-card space-y-4" data-collapsed={!openSections.bands}>
            <div className="admin-row">
              <h2 className="track-title">Bands</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("bands")}>
                {openSections.bands ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={!designDraft.bands.length}
                onClick={() =>
                  updateDesign((prev) => ({
                    ...prev,
                    bands: prev.bands.map((band) => ({ ...band, enabled: true })),
                  }))
                }
              >
                Select All
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={!designDraft.bands.length}
                onClick={() =>
                  updateDesign((prev) => ({
                    ...prev,
                    bands: prev.bands.map((band) => ({ ...band, enabled: false })),
                  }))
                }
              >
                Unselect All
              </button>
            </div>
            <p className="track-meta">Branch 2. Select which song-library bands are available in the game.</p>
            <div className="rounded border-2 border-black bg-white p-3">
              {designDraft.bands.length ? (
                <ul className="space-y-2">
                  {designDraft.bands.map((band, index) => (
                    <li key={`${band.id}-${index}`}>
                      <label className="flex items-center gap-2 text-sm font-semibold uppercase">
                        <input
                          type="checkbox"
                          checked={band.enabled}
                          onChange={(event) =>
                            updateDesign((prev) => ({
                              ...prev,
                              bands: prev.bands.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, enabled: event.target.checked } : item,
                              ),
                            }))
                          }
                        />
                        <span>{band.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">No song-library bands found yet. Sync songs first.</p>
              )}
            </div>
          </article>

          <article ref={stageRef} className="admin-card space-y-4" data-collapsed={!openSections.stage}>
            <div className="admin-row">
              <h2 className="track-title">Stage Designs</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("stage")}>
                {openSections.stage ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() =>
                  updateDesign((prev) => ({
                    ...prev,
                    stageDesigns: [...prev.stageDesigns, createStageDesign(prev.stageDesigns.length)],
                  }))
                }
              >
                Add Stage Design
              </button>
            </div>
            <p className="track-meta">Branch 3. Stage choices should change vibe and risk. Use caption for the story beat text.</p>
            <div className="space-y-4">
              {designDraft.stageDesigns.map((item, index) => (
                <div key={`${item.id}-${index}`} className="rounded border-2 border-black p-3">
                  <div className="admin-row">
                    <p className="font-bold uppercase">Stage Design {index + 1}</p>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          stageDesigns: prev.stageDesigns.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="admin-grid mt-3">
                    <input
                      className="admin-input"
                      value={item.id}
                      placeholder="id"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, id: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                    <input
                      className="admin-input"
                      value={item.name}
                      placeholder="name"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, name: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                    <label className="track-meta flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) =>
                          updateDesign((prev) => ({
                            ...prev,
                            stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                              itemIndex === index ? { ...entry, enabled: event.target.checked } : entry,
                            ),
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={item.description}
                    placeholder="description"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, description: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                  <input
                    className="admin-input mt-2"
                    value={item.image}
                    placeholder="image URL or data URL"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, image: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="admin-input mt-2"
                    onChange={(event) =>
                      void handleImageUpload(event.target.files?.[0] ?? null, (dataUrl) =>
                        updateDesign((prev) => ({
                          ...prev,
                          stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, image: dataUrl } : entry,
                          ),
                        })),
                      )
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={item.caption}
                    placeholder="caption"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, caption: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                  <div className="admin-grid mt-2">
                    <input
                      type="number"
                      className="admin-input"
                      value={item.effects.budget}
                      placeholder="budget effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...entry,
                                  effects: {
                                    ...entry.effects,
                                    budget: parseSafeInt(event.target.value, entry.effects.budget),
                                  },
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={item.effects.hype}
                      placeholder="hype effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...entry,
                                  effects: {
                                    ...entry.effects,
                                    hype: parseSafeInt(event.target.value, entry.effects.hype),
                                  },
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={item.effects.chaos}
                      placeholder="chaos effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          stageDesigns: prev.stageDesigns.map((entry, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...entry,
                                  effects: {
                                    ...entry.effects,
                                    chaos: parseSafeInt(event.target.value, entry.effects.chaos),
                                  },
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article ref={promoRef} className="admin-card space-y-4" data-collapsed={!openSections.promo}>
            <div className="admin-row">
              <h2 className="track-title">Promotion Methods</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("promo")}>
                {openSections.promo ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() =>
                  updateDesign((prev) => ({
                    ...prev,
                    promotionMethods: [
                      ...prev.promotionMethods,
                      createPromotion(prev.promotionMethods.length),
                    ],
                  }))
                }
              >
                Add Promotion
              </button>
            </div>
            <p className="track-meta">Branch 4. Promotion options should trade budget vs hype with funny flavor text.</p>
            <div className="space-y-4">
              {designDraft.promotionMethods.map((item, index) => (
                <div key={`${item.id}-${index}`} className="rounded border-2 border-black p-3">
                  <div className="admin-row">
                    <p className="font-bold uppercase">Promotion {index + 1}</p>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          promotionMethods: prev.promotionMethods.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="admin-grid mt-3">
                    <input
                      className="admin-input"
                      value={item.id}
                      placeholder="id"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, id: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                    <input
                      className="admin-input"
                      value={item.name}
                      placeholder="name"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, name: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                    <label className="track-meta flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) =>
                          updateDesign((prev) => ({
                            ...prev,
                            promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                              itemIndex === index ? { ...entry, enabled: event.target.checked } : entry,
                            ),
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={item.description}
                    placeholder="description"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, description: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                  <input
                    className="admin-input mt-2"
                    value={item.image}
                    placeholder="image URL or data URL"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, image: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="admin-input mt-2"
                    onChange={(event) =>
                      void handleImageUpload(event.target.files?.[0] ?? null, (dataUrl) =>
                        updateDesign((prev) => ({
                          ...prev,
                          promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, image: dataUrl } : entry,
                          ),
                        })),
                      )
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={item.caption}
                    placeholder="caption"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, caption: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                  <div className="admin-grid mt-2">
                    <input
                      type="number"
                      className="admin-input"
                      value={item.effects.budget}
                      placeholder="budget effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...entry,
                                  effects: {
                                    ...entry.effects,
                                    budget: parseSafeInt(event.target.value, entry.effects.budget),
                                  },
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={item.effects.hype}
                      placeholder="hype effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...entry,
                                  effects: {
                                    ...entry.effects,
                                    hype: parseSafeInt(event.target.value, entry.effects.hype),
                                  },
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={item.effects.chaos}
                      placeholder="chaos effect"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          promotionMethods: prev.promotionMethods.map((entry, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...entry,
                                  effects: {
                                    ...entry.effects,
                                    chaos: parseSafeInt(event.target.value, entry.effects.chaos),
                                  },
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article ref={extraRef} className="admin-card space-y-4" data-collapsed={!openSections.extra}>
            <div className="admin-row">
              <h2 className="track-title">Extra Stages</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("extra")}>
                {openSections.extra ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() =>
                  updateDesign((prev) => ({
                    ...prev,
                    extraStages: [...prev.extraStages, createExtraStage(prev.extraStages.length)],
                  }))
                }
              >
                Add Extra Stage
              </button>
            </div>
            <p className="track-meta">
              Optional branch layers between Promotion and Problem. Add as many stages as you like.
            </p>

            <div className="space-y-4">
              {designDraft.extraStages.map((stage, stageIndex) => (
                <div key={`${stage.id}-${stageIndex}`} className="rounded border-2 border-black p-3">
                  <div className="admin-row">
                    <p className="font-bold uppercase">Extra Stage {stageIndex + 1}</p>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          extraStages: prev.extraStages.filter((_, itemIndex) => itemIndex !== stageIndex),
                        }))
                      }
                    >
                      Remove Stage
                    </button>
                  </div>

                  <div className="admin-grid mt-3">
                    <input
                      className="admin-input"
                      value={stage.id}
                      placeholder="id"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          extraStages: prev.extraStages.map((item, itemIndex) =>
                            itemIndex === stageIndex ? { ...item, id: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      className="admin-input"
                      value={stage.title}
                      placeholder="title"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          extraStages: prev.extraStages.map((item, itemIndex) =>
                            itemIndex === stageIndex ? { ...item, title: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <label className="track-meta flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={stage.enabled}
                        onChange={(event) =>
                          updateDesign((prev) => ({
                            ...prev,
                            extraStages: prev.extraStages.map((item, itemIndex) =>
                              itemIndex === stageIndex ? { ...item, enabled: event.target.checked } : item,
                            ),
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>

                  <input
                    className="admin-input mt-2"
                    value={stage.prompt}
                    placeholder="prompt shown to player"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        extraStages: prev.extraStages.map((item, itemIndex) =>
                          itemIndex === stageIndex ? { ...item, prompt: event.target.value } : item,
                        ),
                      }))
                    }
                  />

                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={stage.description}
                    placeholder="description"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        extraStages: prev.extraStages.map((item, itemIndex) =>
                          itemIndex === stageIndex ? { ...item, description: event.target.value } : item,
                        ),
                      }))
                    }
                  />

                  <div className="mt-3 rounded border border-black p-2">
                    <div className="admin-row">
                      <p className="font-bold uppercase">Options</p>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() =>
                          updateDesign((prev) => ({
                            ...prev,
                            extraStages: prev.extraStages.map((item, itemIndex) =>
                              itemIndex === stageIndex
                                ? {
                                    ...item,
                                    options: [...item.options, createExtraStageOption(item.options.length)],
                                  }
                                : item,
                            ),
                          }))
                        }
                      >
                        Add Option
                      </button>
                    </div>

                    <div className="space-y-3 mt-2">
                      {stage.options.map((option, optionIndex) => (
                        <div key={`${option.id}-${optionIndex}`} className="rounded border border-black p-2">
                          <div className="admin-row">
                            <p className="text-sm font-bold uppercase">Option {optionIndex + 1}</p>
                            <button
                              type="button"
                              className="admin-btn"
                              onClick={() =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  extraStages: prev.extraStages.map((item, itemIndex) =>
                                    itemIndex === stageIndex
                                      ? {
                                          ...item,
                                          options: item.options.filter((_, i) => i !== optionIndex),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>

                          <div className="admin-grid mt-2">
                            <input
                              className="admin-input"
                              value={option.id}
                              placeholder="id"
                              onChange={(event) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  extraStages: prev.extraStages.map((item, itemIndex) =>
                                    itemIndex === stageIndex
                                      ? {
                                          ...item,
                                          options: item.options.map((opt, i) =>
                                            i === optionIndex ? { ...opt, id: event.target.value } : opt,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                            <input
                              className="admin-input"
                              value={option.name}
                              placeholder="name"
                              onChange={(event) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  extraStages: prev.extraStages.map((item, itemIndex) =>
                                    itemIndex === stageIndex
                                      ? {
                                          ...item,
                                          options: item.options.map((opt, i) =>
                                            i === optionIndex ? { ...opt, name: event.target.value } : opt,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                            <label className="track-meta flex items-center gap-2 pt-2">
                              <input
                                type="checkbox"
                                checked={option.enabled}
                                onChange={(event) =>
                                  updateDesign((prev) => ({
                                    ...prev,
                                    extraStages: prev.extraStages.map((item, itemIndex) =>
                                      itemIndex === stageIndex
                                        ? {
                                            ...item,
                                            options: item.options.map((opt, i) =>
                                              i === optionIndex
                                                ? { ...opt, enabled: event.target.checked }
                                                : opt,
                                            ),
                                          }
                                        : item,
                                    ),
                                  }))
                                }
                              />
                              Enabled
                            </label>
                          </div>

                          <textarea
                            className="admin-textarea mt-2"
                            rows={2}
                            value={option.description}
                            placeholder="description"
                            onChange={(event) =>
                              updateDesign((prev) => ({
                                ...prev,
                                extraStages: prev.extraStages.map((item, itemIndex) =>
                                  itemIndex === stageIndex
                                    ? {
                                        ...item,
                                        options: item.options.map((opt, i) =>
                                          i === optionIndex
                                            ? { ...opt, description: event.target.value }
                                            : opt,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />

                          <input
                            className="admin-input mt-2"
                            value={option.image}
                            placeholder="image URL or data URL"
                            onChange={(event) =>
                              updateDesign((prev) => ({
                                ...prev,
                                extraStages: prev.extraStages.map((item, itemIndex) =>
                                  itemIndex === stageIndex
                                    ? {
                                        ...item,
                                        options: item.options.map((opt, i) =>
                                          i === optionIndex ? { ...opt, image: event.target.value } : opt,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />

                          <input
                            type="file"
                            accept="image/*"
                            className="admin-input mt-2"
                            onChange={(event) =>
                              void handleImageUpload(event.target.files?.[0] ?? null, (dataUrl) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  extraStages: prev.extraStages.map((item, itemIndex) =>
                                    itemIndex === stageIndex
                                      ? {
                                          ...item,
                                          options: item.options.map((opt, i) =>
                                            i === optionIndex ? { ...opt, image: dataUrl } : opt,
                                          ),
                                        }
                                      : item,
                                  ),
                                })),
                              )
                            }
                          />

                          <textarea
                            className="admin-textarea mt-2"
                            rows={2}
                            value={option.caption}
                            placeholder="caption"
                            onChange={(event) =>
                              updateDesign((prev) => ({
                                ...prev,
                                extraStages: prev.extraStages.map((item, itemIndex) =>
                                  itemIndex === stageIndex
                                    ? {
                                        ...item,
                                        options: item.options.map((opt, i) =>
                                          i === optionIndex ? { ...opt, caption: event.target.value } : opt,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />

                          <div className="admin-grid mt-2">
                            <input
                              type="number"
                              className="admin-input"
                              value={option.effects.budget}
                              placeholder="budget effect"
                              onChange={(event) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  extraStages: prev.extraStages.map((item, itemIndex) =>
                                    itemIndex === stageIndex
                                      ? {
                                          ...item,
                                          options: item.options.map((opt, i) =>
                                            i === optionIndex
                                              ? {
                                                  ...opt,
                                                  effects: {
                                                    ...opt.effects,
                                                    budget: parseSafeInt(event.target.value, opt.effects.budget),
                                                  },
                                                }
                                              : opt,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                            <input
                              type="number"
                              className="admin-input"
                              value={option.effects.hype}
                              placeholder="hype effect"
                              onChange={(event) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  extraStages: prev.extraStages.map((item, itemIndex) =>
                                    itemIndex === stageIndex
                                      ? {
                                          ...item,
                                          options: item.options.map((opt, i) =>
                                            i === optionIndex
                                              ? {
                                                  ...opt,
                                                  effects: {
                                                    ...opt.effects,
                                                    hype: parseSafeInt(event.target.value, opt.effects.hype),
                                                  },
                                                }
                                              : opt,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                            <input
                              type="number"
                              className="admin-input"
                              value={option.effects.chaos}
                              placeholder="chaos effect"
                              onChange={(event) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  extraStages: prev.extraStages.map((item, itemIndex) =>
                                    itemIndex === stageIndex
                                      ? {
                                          ...item,
                                          options: item.options.map((opt, i) =>
                                            i === optionIndex
                                              ? {
                                                  ...opt,
                                                  effects: {
                                                    ...opt.effects,
                                                    chaos: parseSafeInt(event.target.value, opt.effects.chaos),
                                                  },
                                                }
                                              : opt,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article ref={problemsRef} className="admin-card space-y-4" data-collapsed={!openSections.problems}>
            <div className="admin-row">
              <h2 className="track-title">Problem Events</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("problems")}>
                {openSections.problems ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() =>
                  updateDesign((prev) => ({
                    ...prev,
                    problemEvents: [...prev.problemEvents, createProblemEvent(prev.problemEvents.length)],
                  }))
                }
              >
                Add Problem Event
              </button>
            </div>
            <p className="track-meta">Branch 5. Each problem choice is a mini-branch. Add clear outcome text in captions.</p>
            <div className="space-y-4">
              {designDraft.problemEvents.map((eventItem, eventIndex) => (
                <div key={`${eventItem.id}-${eventIndex}`} className="rounded border-2 border-black p-3">
                  <div className="admin-row">
                    <p className="font-bold uppercase">Problem Event {eventIndex + 1}</p>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          problemEvents: prev.problemEvents.filter(
                            (_, itemIndex) => itemIndex !== eventIndex,
                          ),
                        }))
                      }
                    >
                      Remove Event
                    </button>
                  </div>
                  <div className="admin-grid mt-3">
                    <input
                      className="admin-input"
                      value={eventItem.id}
                      placeholder="id"
                      onChange={(inputEvent) =>
                        updateDesign((prev) => ({
                          ...prev,
                          problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                            itemIndex === eventIndex ? { ...entry, id: inputEvent.target.value } : entry,
                          ),
                        }))
                      }
                    />
                    <input
                      className="admin-input"
                      value={eventItem.title}
                      placeholder="title"
                      onChange={(inputEvent) =>
                        updateDesign((prev) => ({
                          ...prev,
                          problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                            itemIndex === eventIndex
                              ? { ...entry, title: inputEvent.target.value }
                              : entry,
                          ),
                        }))
                      }
                    />
                    <label className="track-meta flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={eventItem.enabled}
                        onChange={(inputEvent) =>
                          updateDesign((prev) => ({
                            ...prev,
                            problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                              itemIndex === eventIndex
                                ? { ...entry, enabled: inputEvent.target.checked }
                                : entry,
                            ),
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={eventItem.description}
                    placeholder="description"
                    onChange={(inputEvent) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                          itemIndex === eventIndex
                            ? { ...entry, description: inputEvent.target.value }
                            : entry,
                        ),
                      }))
                    }
                  />
                  <input
                    className="admin-input mt-2"
                    value={eventItem.image}
                    placeholder="image URL or data URL"
                    onChange={(inputEvent) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                          itemIndex === eventIndex ? { ...entry, image: inputEvent.target.value } : entry,
                        ),
                      }))
                    }
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="admin-input mt-2"
                    onChange={(inputEvent) =>
                      void handleImageUpload(inputEvent.target.files?.[0] ?? null, (dataUrl) =>
                        updateDesign((prev) => ({
                          ...prev,
                          problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                            itemIndex === eventIndex ? { ...entry, image: dataUrl } : entry,
                          ),
                        })),
                      )
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={eventItem.caption}
                    placeholder="caption"
                    onChange={(inputEvent) =>
                      updateDesign((prev) => ({
                        ...prev,
                        problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                          itemIndex === eventIndex ? { ...entry, caption: inputEvent.target.value } : entry,
                        ),
                      }))
                    }
                  />

                  <div className="mt-3 rounded border border-black p-2">
                    <div className="admin-row">
                      <p className="font-bold uppercase">Choices</p>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() =>
                          updateDesign((prev) => ({
                            ...prev,
                            problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                              itemIndex === eventIndex
                                ? {
                                    ...entry,
                                    choices: [
                                      ...entry.choices,
                                      createProblemChoice(entry.choices.length),
                                    ],
                                  }
                                : entry,
                            ),
                          }))
                        }
                      >
                        Add Choice
                      </button>
                    </div>
                    <div className="space-y-3 mt-2">
                      {eventItem.choices.map((choice, choiceIndex) => (
                        <div
                          key={`${choice.id}-${choiceIndex}`}
                          className="rounded border border-black p-2"
                        >
                          <div className="admin-row">
                            <p className="text-sm font-bold uppercase">Choice {choiceIndex + 1}</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="admin-btn"
                                disabled={choiceIndex === 0}
                                onClick={() =>
                                  updateDesign((prev) => ({
                                    ...prev,
                                    problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                      itemIndex === eventIndex
                                        ? {
                                            ...entry,
                                            choices: moveArrayItem(
                                              entry.choices,
                                              choiceIndex,
                                              choiceIndex - 1,
                                            ),
                                          }
                                        : entry,
                                    ),
                                  }))
                                }
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                className="admin-btn"
                                disabled={choiceIndex === eventItem.choices.length - 1}
                                onClick={() =>
                                  updateDesign((prev) => ({
                                    ...prev,
                                    problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                      itemIndex === eventIndex
                                        ? {
                                            ...entry,
                                            choices: moveArrayItem(
                                              entry.choices,
                                              choiceIndex,
                                              choiceIndex + 1,
                                            ),
                                          }
                                        : entry,
                                    ),
                                  }))
                                }
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                className="admin-btn"
                                onClick={() =>
                                  updateDesign((prev) => ({
                                    ...prev,
                                    problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                      itemIndex === eventIndex
                                        ? {
                                            ...entry,
                                            choices: entry.choices.filter(
                                              (_, itemChoiceIndex) => itemChoiceIndex !== choiceIndex,
                                            ),
                                          }
                                        : entry,
                                    ),
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="admin-grid mt-2">
                            <input
                              className="admin-input"
                              value={choice.id}
                              placeholder="id"
                              onChange={(inputEvent) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                    itemIndex === eventIndex
                                      ? {
                                          ...entry,
                                          choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                            itemChoiceIndex === choiceIndex
                                              ? { ...itemChoice, id: inputEvent.target.value }
                                              : itemChoice,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                            />
                            <input
                              className="admin-input"
                              value={choice.text}
                              placeholder="choice text"
                              onChange={(inputEvent) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                    itemIndex === eventIndex
                                      ? {
                                          ...entry,
                                          choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                            itemChoiceIndex === choiceIndex
                                              ? { ...itemChoice, text: inputEvent.target.value }
                                              : itemChoice,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <input
                            className="admin-input mt-2"
                            value={choice.image}
                            placeholder="image URL or data URL"
                            onChange={(inputEvent) =>
                              updateDesign((prev) => ({
                                ...prev,
                                problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                  itemIndex === eventIndex
                                    ? {
                                        ...entry,
                                        choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                          itemChoiceIndex === choiceIndex
                                            ? { ...itemChoice, image: inputEvent.target.value }
                                            : itemChoice,
                                        ),
                                      }
                                    : entry,
                                ),
                              }))
                            }
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="admin-input mt-2"
                            onChange={(inputEvent) =>
                              void handleImageUpload(inputEvent.target.files?.[0] ?? null, (dataUrl) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                    itemIndex === eventIndex
                                      ? {
                                          ...entry,
                                          choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                            itemChoiceIndex === choiceIndex
                                              ? { ...itemChoice, image: dataUrl }
                                              : itemChoice,
                                          ),
                                        }
                                      : entry,
                                  ),
                                })),
                              )
                            }
                          />
                          <textarea
                            className="admin-textarea mt-2"
                            rows={2}
                            value={choice.caption}
                            placeholder="caption"
                            onChange={(inputEvent) =>
                              updateDesign((prev) => ({
                                ...prev,
                                problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                  itemIndex === eventIndex
                                    ? {
                                        ...entry,
                                        choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                          itemChoiceIndex === choiceIndex
                                            ? { ...itemChoice, caption: inputEvent.target.value }
                                            : itemChoice,
                                        ),
                                      }
                                    : entry,
                                ),
                              }))
                            }
                          />
                          <div className="admin-grid mt-2">
                            <input
                              type="number"
                              className="admin-input"
                              value={choice.effects.budget}
                              placeholder="budget effect"
                              onChange={(inputEvent) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                    itemIndex === eventIndex
                                      ? {
                                          ...entry,
                                          choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                            itemChoiceIndex === choiceIndex
                                              ? {
                                                  ...itemChoice,
                                                  effects: {
                                                    ...itemChoice.effects,
                                                    budget: parseSafeInt(
                                                      inputEvent.target.value,
                                                      itemChoice.effects.budget,
                                                    ),
                                                  },
                                                }
                                              : itemChoice,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                            />
                            <input
                              type="number"
                              className="admin-input"
                              value={choice.effects.hype}
                              placeholder="hype effect"
                              onChange={(inputEvent) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                    itemIndex === eventIndex
                                      ? {
                                          ...entry,
                                          choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                            itemChoiceIndex === choiceIndex
                                              ? {
                                                  ...itemChoice,
                                                  effects: {
                                                    ...itemChoice.effects,
                                                    hype: parseSafeInt(
                                                      inputEvent.target.value,
                                                      itemChoice.effects.hype,
                                                    ),
                                                  },
                                                }
                                              : itemChoice,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                            />
                            <input
                              type="number"
                              className="admin-input"
                              value={choice.effects.chaos}
                              placeholder="chaos effect"
                              onChange={(inputEvent) =>
                                updateDesign((prev) => ({
                                  ...prev,
                                  problemEvents: prev.problemEvents.map((entry, itemIndex) =>
                                    itemIndex === eventIndex
                                      ? {
                                          ...entry,
                                          choices: entry.choices.map((itemChoice, itemChoiceIndex) =>
                                            itemChoiceIndex === choiceIndex
                                              ? {
                                                  ...itemChoice,
                                                  effects: {
                                                    ...itemChoice.effects,
                                                    chaos: parseSafeInt(
                                                      inputEvent.target.value,
                                                      itemChoice.effects.chaos,
                                                    ),
                                                  },
                                                }
                                              : itemChoice,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article ref={endingsRef} className="admin-card space-y-4" data-collapsed={!openSections.endings}>
            <div className="admin-row">
              <h2 className="track-title">Endings</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("endings")}>
                {openSections.endings ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() =>
                  updateDesign((prev) => ({
                    ...prev,
                    endings: [...prev.endings, createEnding(prev.endings.length)],
                  }))
                }
              >
                Add Ending
              </button>
            </div>
            <p className="track-meta">Final branch. Priorities resolve ties; lower numbers evaluate first.</p>
            <div className="space-y-4">
              {designDraft.endings.map((ending, index) => (
                <div key={`${ending.id}-${index}`} className="rounded border-2 border-black p-3">
                  <div className="admin-row">
                    <p className="font-bold uppercase">Ending {index + 1}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={index === 0}
                        onClick={() =>
                          updateDesign((prev) => ({
                            ...prev,
                            endings: moveArrayItem(prev.endings, index, index - 1),
                          }))
                        }
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={index === designDraft.endings.length - 1}
                        onClick={() =>
                          updateDesign((prev) => ({
                            ...prev,
                            endings: moveArrayItem(prev.endings, index, index + 1),
                          }))
                        }
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() =>
                          updateDesign((prev) => ({
                            ...prev,
                            endings: prev.endings.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="admin-grid mt-3">
                    <input
                      className="admin-input"
                      value={ending.id}
                      placeholder="id"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, id: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      className="admin-input"
                      value={ending.title}
                      placeholder="title"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={ending.priority}
                      placeholder="priority"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, priority: parseSafeInt(event.target.value, item.priority) }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={ending.summary}
                    placeholder="summary"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        endings: prev.endings.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, summary: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <input
                    className="admin-input mt-2"
                    value={ending.image}
                    placeholder="image URL or data URL"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        endings: prev.endings.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, image: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="admin-input mt-2"
                    onChange={(event) =>
                      void handleImageUpload(event.target.files?.[0] ?? null, (dataUrl) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, image: dataUrl } : item,
                          ),
                        })),
                      )
                    }
                  />
                  <textarea
                    className="admin-textarea mt-2"
                    rows={2}
                    value={ending.caption}
                    placeholder="caption"
                    onChange={(event) =>
                      updateDesign((prev) => ({
                        ...prev,
                        endings: prev.endings.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, caption: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <div className="admin-grid mt-2">
                    <input
                      type="number"
                      className="admin-input"
                      value={ending.minHype}
                      placeholder="min hype"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, minHype: parseSafeInt(event.target.value, item.minHype) }
                              : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={ending.maxHype}
                      placeholder="max hype"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, maxHype: parseSafeInt(event.target.value, item.maxHype) }
                              : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={ending.minChaos}
                      placeholder="min chaos"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, minChaos: parseSafeInt(event.target.value, item.minChaos) }
                              : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={ending.maxChaos}
                      placeholder="max chaos"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, maxChaos: parseSafeInt(event.target.value, item.maxChaos) }
                              : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={ending.minBudget}
                      placeholder="min budget"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, minBudget: parseSafeInt(event.target.value, item.minBudget) }
                              : item,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      className="admin-input"
                      value={ending.maxBudget}
                      placeholder="max budget"
                      onChange={(event) =>
                        updateDesign((prev) => ({
                          ...prev,
                          endings: prev.endings.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, maxBudget: parseSafeInt(event.target.value, item.maxBudget) }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article ref={jsonRef} className="admin-card" data-collapsed={!openSections.json}>
            <div className="admin-row">
              <h2 className="track-title">Design JSON</h2>
              <button type="button" className="admin-btn" onClick={() => toggleSection("json")}>
                {openSections.json ? "Collapse" : "Expand"}
              </button>
            </div>
            <p className="track-meta mb-3">Power mode. Edit JSON directly and click Apply JSON To Visual Editor to sync forms.</p>
            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              rows={40}
              className="admin-textarea font-mono text-xs sm:text-sm"
              spellCheck={false}
            />
          </article>
        </section>
      </main>
    </div>
  );
}
