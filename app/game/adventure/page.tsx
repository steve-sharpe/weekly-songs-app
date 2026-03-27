"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

type GamePhase = "intro" | "bands" | "venue" | "local" | "stage" | "promotion" | "extra" | "problem" | "ending";

type StoryBeat = {
  title: string;
  image: string;
  caption: string;
};

type DecisionLogEntry = {
  id: string;
  step: string;
  title: string;
  detail: string;
  effects: AdventureEffects;
};

type GameState = {
  budget: number;
  hype: number;
  chaos: number;
  mainBandId: string | null;
  selectedVenueId: string | null;
  selectedBandIds: string[];
  stageDesignId: string | null;
  promotionMethodId: string | null;
  selectedExtraStageOptionIds: Record<string, string>;
  eventProblemId: string | null;
  eventChoiceId: string | null;
};

type LocalInteractionOption = {
  id: string;
  title: string;
  description: string;
  effects: AdventureEffects;
};
const DESIGN_FALLBACK: AdventureDesign = {
  gameTitle: "George Street Promoter Adventure",
  cityName: "St. John's",
  introLine:
    "You are a local promoter trying to run a hit concert with great music, questionable timing, and very limited budget.",
  introImage: "",
  introCaption: "You hold a clipboard and a dream.",
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
  venues: [],
  bands: [],
  stageDesigns: [],
  promotionMethods: [],
  extraStages: [],
  problemEvents: [],
  endings: [],
};

const HERO_SELECTION_COUNT = 1;

const STORYLINE_STOPS: Array<{ phase: GamePhase; label: string }> = [
  { phase: "intro", label: "Intro" },
  { phase: "bands", label: "Main Band" },
  { phase: "venue", label: "Venue" },
  { phase: "local", label: "Local Scene" },
  { phase: "stage", label: "Stage" },
  { phase: "promotion", label: "Promo" },
  { phase: "extra", label: "Branch" },
  { phase: "problem", label: "Crisis" },
  { phase: "ending", label: "Finale" },
];

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCrisisRoundMultiplier(roundIndex: number, difficulty: AdventureDifficulty): number {
  return Math.min(
    difficulty.maxPressureMultiplier,
    difficulty.basePressureMultiplier + roundIndex * difficulty.pressureStepPerRound,
  );
}

function scaleEffects(effects: AdventureEffects, multiplier: number): AdventureEffects {
  return {
    budget: Math.round(effects.budget * multiplier),
    hype: Math.round(effects.hype * multiplier),
    chaos: Math.round(effects.chaos * multiplier),
  };
}

function buildProblemRounds(
  design: AdventureDesign,
  rounds: number,
  minRounds: number,
  maxRounds: number,
): AdventureProblemEvent[] {
  const source = design.problemEvents.filter((event) => event.enabled && event.choices.length > 0);
  if (!source.length) {
    return [];
  }

  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const targetRounds = clamp(rounds, minRounds, maxRounds);
  const picked: AdventureProblemEvent[] = [];

  for (let index = 0; index < targetRounds; index += 1) {
    picked.push(shuffled[index % shuffled.length]);
  }

  return picked;
}

function buildLocalBandQueue(design: AdventureDesign, mainBandId: string): AdventureBand[] {
  const candidates = design.bands.filter((band) => band.enabled && band.id !== mainBandId);
  if (!candidates.length) {
    return [];
  }

  const desiredRounds = clamp(design.difficulty.minProblemRounds, 1, 4);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const queue: AdventureBand[] = [];

  for (let index = 0; index < desiredRounds; index += 1) {
    queue.push(shuffled[index % shuffled.length]);
  }

  return queue;
}

function buildLocalInteractionOptions(localBand: AdventureBand): LocalInteractionOption[] {
  const templates: Array<Omit<LocalInteractionOption, "id" | "title"> & { key: string; titleTemplate: string }> = [
    {
      key: "collab",
      titleTemplate: "Invite {band} For A Surprise Collab",
      description: "A duet, two fog cannons, and absolutely no rehearsal.",
      effects: { budget: -8, hype: 20, chaos: 10 },
    },
    {
      key: "petty-beef",
      titleTemplate: "Start A Friendly Beef With {band}",
      description: "You trade dramatic voice notes online until the city picks sides.",
      effects: { budget: 4, hype: 14, chaos: 18 },
    },
    {
      key: "gift-basket",
      titleTemplate: "Send {band} A Screech-Themed Gift Basket",
      description: "Cheese, pickles, and a peace treaty. Surprisingly effective diplomacy.",
      effects: { budget: -6, hype: 10, chaos: -8 },
    },
    {
      key: "battle-of-bands",
      titleTemplate: "Challenge {band} To A Battle Of Bands",
      description: "Winner takes bragging rights. Loser blames acoustics.",
      effects: { budget: -3, hype: 17, chaos: 12 },
    },
    {
      key: "shared-van",
      titleTemplate: "Offer {band} Shared Van Space",
      description: "You become pals while someone sits on a snare drum for two hours.",
      effects: { budget: 2, hype: 8, chaos: -6 },
    },
    {
      key: "meme-tribute",
      titleTemplate: "Post A 43-Slide Meme Tribute To {band}",
      description: "The internet is confused, then weirdly supportive.",
      effects: { budget: -2, hype: 15, chaos: 9 },
    },
    {
      key: "snack-diplomacy",
      titleTemplate: "Settle Tension With Emergency Nachos For {band}",
      description: "Crunch-based diplomacy saves the night.",
      effects: { budget: -5, hype: 9, chaos: -5 },
    },
    {
      key: "dance-off",
      titleTemplate: "Propose A Parking-Lot Dance-Off With {band}",
      description: "No one wins, everyone sweats, the crowd goes feral.",
      effects: { budget: 0, hype: 13, chaos: 14 },
    },
  ];

  return shuffle(templates)
    .slice(0, 3)
    .map((template) => ({
      id: `${localBand.id}-${template.key}`,
      title: template.titleTemplate.replace("{band}", localBand.name),
      description: template.description,
      effects: template.effects,
    }));
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = next[index];
    next[index] = next[swapIndex] as T;
    next[swapIndex] = temp as T;
  }

  return next;
}

function mergeUniqueById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const byId = new Set(base.map((item) => item.id));
  const merged = [...base];

  for (const item of extra) {
    if (!byId.has(item.id)) {
      merged.push(item);
      byId.add(item.id);
    }
  }

  return merged;
}

function buildComedyOptionPack(): Pick<
  AdventureDesign,
  "venues" | "bands" | "stageDesigns" | "promotionMethods" | "extraStages" | "problemEvents"
> {
  return {
    // Respect creator-provided venue list: do not inject generated venues.
    venues: [],
    // Respect creator-provided roster: do not inject generated bands.
    bands: [],
    stageDesigns: [
      {
        id: "stage-laser-net",
        name: "Laser Fishing Net",
        description: "A ceiling of fake lasers that definitely confuses everyone.",
        image: "",
        caption: "Half the audience thinks this is performance art.",
        effects: { budget: -9, hype: 17, chaos: 11 },
        enabled: true,
      },
      {
        id: "stage-cardboard-castle",
        name: "Cardboard Castle",
        description: "Hand-painted by volunteers and two very committed uncles.",
        image: "",
        caption: "It collapses beautifully during the encore.",
        effects: { budget: -2, hype: 10, chaos: 16 },
        enabled: true,
      },
      {
        id: "stage-underwater-theme",
        name: "Underwater Theme (No Water)",
        description: "Blue lights, bubble machines, and a shark costume near the drums.",
        image: "",
        caption: "The crowd accepts this immediately.",
        effects: { budget: -7, hype: 14, chaos: 8 },
        enabled: true,
      },
      {
        id: "stage-minimalist-chaos",
        name: "Minimalist Chaos",
        description: "One spotlight and maximal emotional damage.",
        image: "",
        caption: "A single lamp changes the whole room.",
        effects: { budget: 3, hype: 9, chaos: 6 },
        enabled: true,
      },
    ],
    promotionMethods: [
      {
        id: "promo-flash-mob",
        name: "Questionable Flash Mob",
        description: "A choreographed routine in front of city hall. Mostly synchronized.",
        image: "",
        caption: "A councillor accidentally joins in.",
        effects: { budget: -12, hype: 23, chaos: 13 },
        enabled: true,
      },
      {
        id: "promo-meme-war",
        name: "Meme War Campaign",
        description: "You post 40 memes in one day and become unavoidable.",
        image: "",
        caption: "Even your dentist shares one.",
        effects: { budget: -3, hype: 19, chaos: 9 },
        enabled: true,
      },
      {
        id: "promo-free-stickers",
        name: "Sticker Rain",
        description: "You print a thousand stickers and lose all sense of proportion.",
        image: "",
        caption: "Every guitar case in town is now branded.",
        effects: { budget: -8, hype: 13, chaos: 3 },
        enabled: true,
      },
      {
        id: "promo-radio-prank",
        name: "Community Radio Prank Call Arc",
        description: "You call in as " + '"concerned citizens"' + " until everyone knows your show date.",
        image: "",
        caption: "The host pretends not to notice.",
        effects: { budget: 2, hype: 11, chaos: 15 },
        enabled: true,
      },
    ],
    extraStages: [
      {
        id: "extra-street-team",
        title: "Street Team Shenanigans",
        prompt: "How does your band recruit chaos volunteers?",
        description: "An extra narrative branch before crisis mode kicks in.",
        enabled: true,
        options: [
          {
            id: "street-team-uniforms",
            name: "Matching Capes",
            description: "Everyone gets capes and confidence levels spike dangerously.",
            image: "",
            caption: "The city has questions.",
            effects: { budget: -9, hype: 16, chaos: 12 },
            enabled: true,
          },
          {
            id: "street-team-whistles",
            name: "Whistle Coordination",
            description: "A tactical whistle system that nobody truly understands.",
            image: "",
            caption: "It is loud. It is unforgettable.",
            effects: { budget: -3, hype: 10, chaos: 7 },
            enabled: true,
          },
          {
            id: "street-team-friendly",
            name: "Polite Handshakes",
            description: "Low-chaos networking with suspiciously good outcomes.",
            image: "",
            caption: "Your professionalism is unsettling.",
            effects: { budget: 1, hype: 8, chaos: -4 },
            enabled: true,
          },
        ],
      },
    ],
    problemEvents: [
      {
        id: "problem-seagull-heist",
        title: "Seagull Merch Heist",
        description: "A seagull gang steals half your tote bags before doors open.",
        image: "",
        caption: "They are organized. Disturbingly organized.",
        enabled: true,
        choices: [
          {
            id: "seagull-negotiate",
            text: "Negotiate with fries",
            image: "",
            caption: "A peace treaty is signed in ketchup.",
            effects: { budget: -6, hype: 12, chaos: -2 },
          },
          {
            id: "seagull-pursuit",
            text: "Chase them through downtown",
            image: "",
            caption: "Tourists applaud. You are exhausted.",
            effects: { budget: -2, hype: 7, chaos: 15 },
          },
          {
            id: "seagull-rebrand",
            text: "Call it immersive performance art",
            image: "",
            caption: "Local press loves it for reasons unknown.",
            effects: { budget: 4, hype: 16, chaos: 10 },
          },
        ],
      },
      {
        id: "problem-mayor-visit",
        title: "Unexpected Mayor Drop-In",
        description: "The mayor arrives with a camera crew and several opinions.",
        image: "",
        caption: "This was not on your checklist.",
        enabled: true,
        choices: [
          {
            id: "mayor-stage-dive",
            text: "Invite the mayor to stage dive",
            image: "",
            caption: "Security has mixed feelings.",
            effects: { budget: -4, hype: 18, chaos: 16 },
          },
          {
            id: "mayor-vip-seat",
            text: "Offer a VIP seat and snacks",
            image: "",
            caption: "Everyone behaves for at least six minutes.",
            effects: { budget: -8, hype: 10, chaos: -3 },
          },
          {
            id: "mayor-duet",
            text: "Do an awkward duet",
            image: "",
            caption: "It goes viral by midnight.",
            effects: { budget: 6, hype: 20, chaos: 8 },
          },
        ],
      },
    ],
  };
}

function prepareRunDesign(raw: AdventureDesign): AdventureDesign {
  const pack = buildComedyOptionPack();

  const merged: AdventureDesign = {
    ...raw,
    venues: mergeUniqueById(raw.venues, pack.venues),
    bands: mergeUniqueById(raw.bands, pack.bands),
    stageDesigns: mergeUniqueById(raw.stageDesigns, pack.stageDesigns),
    promotionMethods: mergeUniqueById(raw.promotionMethods, pack.promotionMethods),
    extraStages: mergeUniqueById(raw.extraStages, pack.extraStages),
    problemEvents: mergeUniqueById(raw.problemEvents, pack.problemEvents),
  };

  return {
    ...merged,
    venues: merged.venues,
    bands: shuffle(merged.bands),
    stageDesigns: shuffle(merged.stageDesigns),
    promotionMethods: shuffle(merged.promotionMethods),
    extraStages: shuffle(merged.extraStages).map((stage) => ({ ...stage, options: shuffle(stage.options) })),
    problemEvents: shuffle(merged.problemEvents).map((problem) => ({ ...problem, choices: shuffle(problem.choices) })),
  };
}

function applyEffects(state: GameState, effects: AdventureEffects): GameState {
  return {
    ...state,
    budget: state.budget + effects.budget,
    hype: state.hype + effects.hype,
    chaos: state.chaos + effects.chaos,
  };
}

function buildInitialState(design: AdventureDesign): GameState {
  return {
    budget: design.startingBudget,
    hype: design.startingHype,
    chaos: design.startingChaos,
    mainBandId: null,
    selectedVenueId: null,
    selectedBandIds: [],
    stageDesignId: null,
    promotionMethodId: null,
    selectedExtraStageOptionIds: {},
    eventProblemId: null,
    eventChoiceId: null,
  };
}

function chooseEnding(design: AdventureDesign, state: GameState): AdventureEnding | null {
  const sorted = [...design.endings].sort((a, b) => a.priority - b.priority);

  const matched = sorted.find((ending) => {
    const hypeOk = state.hype >= ending.minHype && state.hype <= ending.maxHype;
    const chaosOk = state.chaos >= ending.minChaos && state.chaos <= ending.maxChaos;
    const budgetOk = state.budget >= ending.minBudget && state.budget <= ending.maxBudget;
    return hypeOk && chaosOk && budgetOk;
  });

  return matched ?? sorted[sorted.length - 1] ?? null;
}

function fillTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>,
): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value ?? ""));
  }, template);
}

function toBackgroundImage(photo: string): string {
  return `url("${photo.replace(/"/g, "\\\"")}")`;
}

function hashHue(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) % 360;
}

function buildFallbackArt(seed: string): string {
  const hue = hashHue(seed);
  const accent = (hue + 45) % 360;
  return `linear-gradient(135deg, hsl(${hue} 95% 78%) 0%, hsl(${accent} 90% 60%) 55%, hsl(${hue} 65% 32%) 120%)`;
}

function decisionImpactScore(effects: AdventureEffects): number {
  return effects.hype + effects.budget - effects.chaos;
}

function getPerformanceGrade(score: number): string {
  if (score >= 130) {
    return "S+";
  }

  if (score >= 95) {
    return "A";
  }

  if (score >= 65) {
    return "B";
  }

  if (score >= 35) {
    return "C";
  }

  return "D";
}

export default function AdventureGamePage() {
  const [design, setDesign] = useState<AdventureDesign | null>(null);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [state, setState] = useState<GameState>(() => buildInitialState(DESIGN_FALLBACK));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [storyBeat, setStoryBeat] = useState<StoryBeat | null>(null);
  const [problemEvent, setProblemEvent] = useState<AdventureProblemEvent | null>(null);
  const [problemQueue, setProblemQueue] = useState<AdventureProblemEvent[]>([]);
  const [problemRoundIndex, setProblemRoundIndex] = useState(0);
  const [pendingBandIds, setPendingBandIds] = useState<string[]>([]);
  const [localBandQueue, setLocalBandQueue] = useState<AdventureBand[]>([]);
  const [localBandIndex, setLocalBandIndex] = useState(0);
  const [localInteractionOptions, setLocalInteractionOptions] = useState<LocalInteractionOption[]>([]);
  const [extraStageIndex, setExtraStageIndex] = useState(0);
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);
  const [latestImpact, setLatestImpact] = useState<DecisionLogEntry | null>(null);

  const enabledVenues = useMemo(() => (design ? design.venues.filter((item) => item.enabled) : []), [design]);
  const enabledBands = useMemo(() => (design ? design.bands.filter((item) => item.enabled) : []), [design]);
  const enabledStageDesigns = useMemo(
    () => (design ? design.stageDesigns.filter((item) => item.enabled) : []),
    [design],
  );
  const enabledPromotions = useMemo(
    () => (design ? design.promotionMethods.filter((item) => item.enabled) : []),
    [design],
  );
  const enabledExtraStages = useMemo(
    () =>
      design
        ? design.extraStages
            .filter((stage) => stage.enabled)
            .map((stage) => ({
              ...stage,
              options: stage.options.filter((option) => option.enabled),
            }))
            .filter((stage) => stage.options.length > 0)
        : [],
    [design],
  );

  const selectedVenue = useMemo(
    () => enabledVenues.find((item) => item.id === state.selectedVenueId) ?? null,
    [enabledVenues, state.selectedVenueId],
  );

  const selectedLocalBands = useMemo(() => {
    const selected = new Set(state.selectedBandIds);
    return enabledBands.filter((item) => selected.has(item.id));
  }, [enabledBands, state.selectedBandIds]);

  const mainBand = useMemo(
    () => enabledBands.find((band) => band.id === state.mainBandId) ?? null,
    [enabledBands, state.mainBandId],
  );

  const selectedBands = useMemo(() => {
    const combined: AdventureBand[] = [];
    if (mainBand) {
      combined.push(mainBand);
    }
    return [...combined, ...selectedLocalBands];
  }, [mainBand, selectedLocalBands]);

  const selectedStageDesign = useMemo(
    () => enabledStageDesigns.find((item) => item.id === state.stageDesignId) ?? null,
    [enabledStageDesigns, state.stageDesignId],
  );

  const selectedPromotion = useMemo(
    () => enabledPromotions.find((item) => item.id === state.promotionMethodId) ?? null,
    [enabledPromotions, state.promotionMethodId],
  );

  const currentLocalBand = useMemo(() => localBandQueue[localBandIndex] ?? null, [localBandQueue, localBandIndex]);

  const ending = useMemo(() => {
    if (!design || phase !== "ending") {
      return null;
    }

    return chooseEnding(design, state);
  }, [design, phase, state]);

  function recordDecision(step: string, title: string, detail: string, effects: AdventureEffects) {
    const entry: DecisionLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      step,
      title,
      detail,
      effects,
    };

    setLatestImpact(entry);
    setDecisionLog((prev) => [...prev, entry]);
  }

  function startProblemRounds(nextState: GameState, currentDesign: AdventureDesign) {
    const difficulty = currentDesign.difficulty;
    const roundsFromContent = difficulty.minProblemRounds + enabledExtraStages.length;
    const pressureBonus =
      (nextState.hype >= difficulty.hypeBonusThreshold ? 1 : 0) +
      (nextState.chaos >= difficulty.chaosBonusThreshold ? 1 : 0);
    const rounds = buildProblemRounds(
      currentDesign,
      roundsFromContent + pressureBonus,
      difficulty.minProblemRounds,
      difficulty.maxProblemRounds,
    );
    if (!rounds.length) {
      setState(nextState);
      setPhase("ending");
      return;
    }

    const firstRound = rounds[0];
    setProblemQueue(rounds);
    setProblemRoundIndex(0);
    setProblemEvent(firstRound);
    setState({
      ...nextState,
      eventProblemId: firstRound.id,
      eventChoiceId: null,
    });
    setPhase("problem");
  }

  async function loadDesignAndStart() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/adventure/design");
      const body = (await response.json()) as { design?: AdventureDesign; error?: string };

      if (!response.ok || !body.design) {
        throw new Error(body.error || "Failed to load adventure setup.");
      }

      const loadedDesign = prepareRunDesign(body.design);
      setDesign(loadedDesign);
      setState(buildInitialState(loadedDesign));
      setPendingBandIds([]);
      setLocalBandQueue([]);
      setLocalBandIndex(0);
      setLocalInteractionOptions([]);
      setProblemEvent(null);
      setProblemQueue([]);
      setProblemRoundIndex(0);
      setExtraStageIndex(0);
      setDecisionLog([]);
      setLatestImpact(null);
      setStoryBeat({
        title: loadedDesign.gameTitle,
        image: loadedDesign.introImage,
        caption: loadedDesign.introCaption,
      });
      setMessage(
        `Loaded chaos pack: ${loadedDesign.venues.length} venues, ${loadedDesign.bands.length} bands, ${loadedDesign.stageDesigns.length} stage concepts, and ${loadedDesign.problemEvents.length} crisis events.`,
      );
      setPhase("bands");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function selectVenue(option: AdventureVenue) {
    setState((prev) => applyEffects({ ...prev, selectedVenueId: option.id }, option.effects));
    setStoryBeat({ title: option.name, image: option.image, caption: option.caption });
    recordDecision("Venue", option.name, option.description, option.effects);

    if (localBandQueue.length > 0) {
      const nextLocalBand = localBandQueue[0];
      setLocalBandIndex(0);
      setLocalInteractionOptions(buildLocalInteractionOptions(nextLocalBand));
      setStoryBeat({
        title: `Backstage Encounter: ${nextLocalBand.name}`,
        image: nextLocalBand.image,
        caption: `${nextLocalBand.caption} You now decide how weird this alliance gets.`,
      });
      setPhase("local");
      return;
    }

    setPhase("stage");
  }

  function toggleBand(id: string) {
    setPendingBandIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      return [id];
    });
  }

  function confirmBands() {
    if (!design || pendingBandIds.length !== HERO_SELECTION_COUNT) {
      return;
    }

    const heroId = pendingBandIds[0];
    const selected = design.bands.find((band) => band.id === heroId);
    if (!selected) {
      return;
    }

    const heroBoost: AdventureEffects = {
      budget: Math.round(selected.effects.budget * 0.5),
      hype: Math.round(selected.effects.hype * 0.6),
      chaos: Math.round(selected.effects.chaos * 0.4),
    };

    setState((prev) =>
      applyEffects({ ...prev, mainBandId: heroId, selectedBandIds: [] }, heroBoost),
    );

    const queue = buildLocalBandQueue(design, heroId);
    setLocalBandQueue(queue);
    setLocalBandIndex(0);
    setLocalInteractionOptions(queue.length ? buildLocalInteractionOptions(queue[0]) : []);

    setStoryBeat({
      title: `${selected.name} Is Your Main Act`,
      image: selected.image ?? "",
      caption: `${selected.caption} Tonight is their shot at becoming legends on George Street.`,
    });
    recordDecision("Main Band", selected.name, "You picked your over-the-top protagonist.", heroBoost);

    setPhase("venue");
  }

  function chooseLocalInteraction(localBand: AdventureBand, choice: LocalInteractionOption) {
    const next = applyEffects(
      {
        ...state,
        selectedBandIds: state.selectedBandIds.includes(localBand.id)
          ? state.selectedBandIds
          : [...state.selectedBandIds, localBand.id],
      },
      choice.effects,
    );

    setState(next);
    recordDecision(
      `Local Band Round ${localBandIndex + 1}`,
      choice.title,
      `With ${localBand.name}: ${choice.description}`,
      choice.effects,
    );

    const nextIndex = localBandIndex + 1;
    if (nextIndex < localBandQueue.length) {
      const nextBand = localBandQueue[nextIndex];
      setLocalBandIndex(nextIndex);
      setLocalInteractionOptions(buildLocalInteractionOptions(nextBand));
      setStoryBeat({
        title: `New Local Encounter: ${nextBand.name}`,
        image: nextBand.image,
        caption: `${nextBand.caption} How do you handle this beautiful chaos?`,
      });
      setPhase("local");
      return;
    }

    setStoryBeat({
      title: "The Local Scene Is Watching",
      image: localBand.image,
      caption: "Your reputation is now all over town. Time to lock in your stage plan.",
    });
    setLocalInteractionOptions([]);
    setPhase("stage");
  }

  function chooseStageDesign(option: AdventureStageDesign) {
    setState((prev) => applyEffects({ ...prev, stageDesignId: option.id }, option.effects));
    setStoryBeat({ title: option.name, image: option.image, caption: option.caption });
    recordDecision("Stage Design", option.name, option.description, option.effects);
    setPhase("promotion");
  }

  function choosePromotion(option: AdventurePromotion) {
    if (!design) {
      return;
    }

    const nextState = applyEffects({ ...state, promotionMethodId: option.id }, option.effects);
    setStoryBeat({ title: option.name, image: option.image, caption: option.caption });
    recordDecision("Promotion", option.name, option.description, option.effects);

    if (enabledExtraStages.length > 0) {
      setState(nextState);
      setExtraStageIndex(0);
      setPhase("extra");
      return;
    }

    startProblemRounds(nextState, design);
  }

  function chooseExtraStageOption(stage: AdventureExtraStage, option: AdventureExtraStageOption) {
    const next = applyEffects(
      {
        ...state,
        selectedExtraStageOptionIds: {
          ...state.selectedExtraStageOptionIds,
          [stage.id]: option.id,
        },
      },
      option.effects,
    );

    const nextIndex = extraStageIndex + 1;
    setStoryBeat({ title: option.name, image: option.image, caption: option.caption });
    recordDecision(stage.title, option.name, option.description, option.effects);

    if (nextIndex < enabledExtraStages.length) {
      setState(next);
      setExtraStageIndex(nextIndex);
      setPhase("extra");
      return;
    }

    if (!design) {
      setState(next);
      setPhase("ending");
      return;
    }

    startProblemRounds(next, design);
  }

  function chooseProblemResolution(choice: AdventureProblemChoice) {
    const multiplier = getCrisisRoundMultiplier(problemRoundIndex, design?.difficulty ?? DESIGN_FALLBACK.difficulty);
    const scaledEffects = scaleEffects(choice.effects, multiplier);
    const next = applyEffects({ ...state, eventChoiceId: choice.id }, scaledEffects);
    setState(next);
    setStoryBeat({ title: "Crisis Response", image: choice.image, caption: choice.caption });
    recordDecision(
      `Crisis Round ${problemRoundIndex + 1}`,
      choice.text,
      `${problemEvent?.title ?? "You resolved a crisis."} (Pressure x${multiplier.toFixed(1)})`,
      scaledEffects,
    );

    const nextRoundIndex = problemRoundIndex + 1;
    if (nextRoundIndex < problemQueue.length) {
      const nextProblem = problemQueue[nextRoundIndex];
      setProblemRoundIndex(nextRoundIndex);
      setProblemEvent(nextProblem);
      setState({
        ...next,
        eventProblemId: nextProblem.id,
        eventChoiceId: null,
      });
      setStoryBeat({
        title: `Crisis Incoming: ${nextProblem.title}`,
        image: nextProblem.image,
        caption: nextProblem.caption || nextProblem.description,
      });
      setPhase("problem");
      return;
    }

    setPhase("ending");
  }

  function replay() {
    if (!design) {
      setPhase("intro");
      return;
    }

    setState(buildInitialState(design));
    setPendingBandIds([]);
    setLocalBandQueue([]);
    setLocalBandIndex(0);
    setLocalInteractionOptions([]);
    setProblemEvent(null);
    setProblemQueue([]);
    setProblemRoundIndex(0);
    setExtraStageIndex(0);
    setDecisionLog([]);
    setLatestImpact(null);
    setStoryBeat({ title: design.gameTitle, image: design.introImage, caption: design.introCaption });
    setPhase("bands");
    setMessage("");
  }

  const endingSummary = useMemo(() => {
    if (!ending || !design) {
      return "";
    }

    return fillTemplate(ending.summary, {
      venueName: selectedVenue?.name ?? "your chosen venue",
      bandNames: selectedBands.map((band) => band.name).join(", ") || "your lineup",
      cityName: design.cityName,
      budget: state.budget,
      hype: state.hype,
      chaos: state.chaos,
    });
  }, [design, ending, selectedBands, selectedVenue?.name, state.budget, state.chaos, state.hype]);

  const problemStepNumber = 6 + enabledExtraStages.length;
  const endingStepNumber = problemStepNumber + 1;
  const startBudget = design?.startingBudget ?? DESIGN_FALLBACK.startingBudget;
  const startHype = design?.startingHype ?? DESIGN_FALLBACK.startingHype;
  const startChaos = design?.startingChaos ?? DESIGN_FALLBACK.startingChaos;
  const netBudget = state.budget - startBudget;
  const netHype = state.hype - startHype;
  const netChaos = state.chaos - startChaos;
  const problemRoundsPlanned = problemQueue.length || (phase === "problem" ? 1 : 0);
  const totalRoundsPlanned = 4 + enabledExtraStages.length + problemRoundsPlanned;
  const completedRounds = decisionLog.length;
  const concertScore = state.hype + state.budget - state.chaos;
  const lastDecisions = decisionLog.slice(-5).reverse();
  const bestDecision = decisionLog.length
    ? [...decisionLog].sort((a, b) => decisionImpactScore(b.effects) - decisionImpactScore(a.effects))[0]
    : null;
  const worstDecision = decisionLog.length
    ? [...decisionLog].sort((a, b) => decisionImpactScore(a.effects) - decisionImpactScore(b.effects))[0]
    : null;
  const performanceGrade = getPerformanceGrade(concertScore);
  const budgetMeter = clamp(Math.round((state.budget / Math.max(startBudget * 2, 100)) * 100), 0, 100);
  const hypeMeter = clamp(Math.round((state.hype / 120) * 100), 0, 100);
  const chaosMeter = clamp(Math.round((state.chaos / 120) * 100), 0, 100);
  const currentStopIndex = STORYLINE_STOPS.findIndex((stop) => stop.phase === phase);
  const storylineCompletion =
    STORYLINE_STOPS.length > 1
      ? Math.round((clamp(currentStopIndex, 0, STORYLINE_STOPS.length - 1) / (STORYLINE_STOPS.length - 1)) * 100)
      : 0;
  const deltaScale = 2;
  const budgetDeltaWidth = clamp(Math.abs(netBudget) * deltaScale, 0, 100);
  const hypeDeltaWidth = clamp(Math.abs(netHype) * deltaScale, 0, 100);
  const chaosDeltaWidth = clamp(Math.abs(netChaos) * deltaScale, 0, 100);

  return (
    <div className="comic-bg adventure-shell min-h-screen px-4 py-8 text-black sm:px-8">
      <div className="bg-orb orb-a" aria-hidden />
      <div className="bg-orb orb-b" aria-hidden />
      <div className="bg-orb orb-c" aria-hidden />
      <main className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="weekly-back-btn inline-block">
            ← Home
          </Link>
          <Link href="/game" className="weekly-back-btn inline-block">
            ← Booking Manager
          </Link>
          <Link href="/admin/adventure" className="weekly-back-btn inline-block">
            Adventure Admin
          </Link>
        </div>

        <section className="paper-panel adventure-panel mt-4 overflow-hidden">
          <h1 className="weekly-panel-title">Concert Promoter Adventure</h1>
          <p className="weekly-subtitle">A high-feedback choose-your-own-adventure in St. John&apos;s.</p>

          <div className="stage-screen mx-auto mt-5 w-full max-w-[860px] overflow-hidden rounded border-2 border-black bg-white shadow-[6px_6px_0_#000]">
            <div className="flex h-full flex-col">
              <header className="border-b-2 border-black bg-yellow-200 px-4 py-3 adventure-header">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="status-pill">
                    <p className="status-label">Budget</p>
                    <p className="status-value">${state.budget}</p>
                    <div className="meter-shell">
                      <div className="meter-fill meter-budget" style={{ width: `${budgetMeter}%` }} />
                    </div>
                  </div>
                  <div className="status-pill">
                    <p className="status-label">Hype</p>
                    <p className="status-value">{state.hype}</p>
                    <div className="meter-shell">
                      <div className="meter-fill meter-hype" style={{ width: `${hypeMeter}%` }} />
                    </div>
                  </div>
                  <div className="status-pill">
                    <p className="status-label">Chaos</p>
                    <p className="status-value">{state.chaos}</p>
                    <div className="meter-shell">
                      <div className="meter-fill meter-chaos" style={{ width: `${chaosMeter}%` }} />
                    </div>
                  </div>
                </div>
                {phase !== "intro" ? (
                  <div className="mt-2 flex items-center justify-between text-xs font-bold uppercase">
                    <span>Round {Math.min(completedRounds + 1, Math.max(1, totalRoundsPlanned))}</span>
                    <span>
                      Completed {completedRounds}
                      {totalRoundsPlanned > 0 ? ` / ${totalRoundsPlanned}` : ""}
                    </span>
                  </div>
                ) : null}
                <div className="phase-track mt-3">
                  <div className="phase-track-line" />
                  <div className="phase-track-fill" style={{ width: `${storylineCompletion}%` }} />
                  <ol className="phase-track-list">
                    {STORYLINE_STOPS.map((stop, index) => {
                      const isDone = index < currentStopIndex;
                      const isActive = index === currentStopIndex;

                      return (
                        <li key={stop.phase} className="phase-stop">
                          <span
                            className={`phase-dot ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}
                            aria-hidden
                          />
                          <span className="phase-label">{stop.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {message ? <p className="admin-message mb-3">{message}</p> : null}

                {phase !== "intro" ? (
                  <section className="mb-4 grid gap-3 sm:grid-cols-2">
                    <div className="feedback-card rounded border-2 border-black p-3">
                      <p className="text-xs font-black uppercase">Live Impact</p>
                      {latestImpact ? (
                        <>
                          <p className="mt-1 text-sm font-black uppercase">{latestImpact.step}: {latestImpact.title}</p>
                          <p className="text-sm">{latestImpact.detail}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase">
                            <span className="impact-chip">Budget {formatSigned(latestImpact.effects.budget)}</span>
                            <span className="impact-chip">Hype {formatSigned(latestImpact.effects.hype)}</span>
                            <span className="impact-chip">Chaos {formatSigned(latestImpact.effects.chaos)}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm">Pick your first move to see instant outcome feedback.</p>
                      )}
                    </div>

                    <div className="feedback-card rounded border-2 border-black p-3">
                      <p className="text-xs font-black uppercase">Decision Timeline</p>
                      {lastDecisions.length ? (
                        <ul className="mt-2 space-y-1 text-sm">
                          {lastDecisions.map((entry) => (
                            <li key={entry.id} className="rounded border border-black bg-white px-2 py-1">
                              <p className="font-bold uppercase">{entry.step}: {entry.title}</p>
                              <p className="text-xs">
                                B {formatSigned(entry.effects.budget)} | H {formatSigned(entry.effects.hype)} | C {formatSigned(entry.effects.chaos)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm">Your timeline will fill as you progress through rounds.</p>
                      )}
                    </div>
                  </section>
                ) : null}

                {storyBeat ? (
                  <section className="story-beat-card mb-4 rounded border-2 border-black p-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,190px)_1fr] sm:items-center">
                      <div
                        className="story-art h-32 w-full rounded border border-black bg-cover bg-center sm:h-36"
                        style={{
                          backgroundImage: storyBeat.image
                            ? toBackgroundImage(storyBeat.image)
                            : buildFallbackArt(storyBeat.title),
                        }}
                      >
                        <span className="story-art-tag">Current Scene</span>
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase sm:text-base">{storyBeat.title}</h2>
                        <p className="mt-2 text-sm">{storyBeat.caption}</p>
                      </div>
                    </div>
                  </section>
                ) : null}

                {phase === "intro" ? (
                  <section className="space-y-3">
                    <h2 className="track-title">Start Your Night</h2>
                    <p>
                      Pick one ridiculous local band and guide them from George Street chaos to citywide fame.
                      Your reputation rises or crashes based on how you treat every local band you meet.
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadDesignAndStart()}
                      disabled={loading}
                      className="admin-btn"
                    >
                      {loading ? "Loading Setup..." : "Start Adventure"}
                    </button>
                  </section>
                ) : null}

                {phase === "venue" ? (
                  <section>
                    <h2 className="track-title">2) Book The First Venue</h2>
                    <p className="track-meta">Where does your band attempt its first absurd breakout show?</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {enabledVenues.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className="choice-card rounded border-2 border-black bg-white p-3 text-left"
                          onClick={() => selectVenue(option)}
                        >
                          <div
                            className="choice-art mb-2 h-24 w-full rounded border border-black bg-cover bg-center"
                            style={{
                              backgroundImage: option.image
                                ? toBackgroundImage(option.image)
                                : buildFallbackArt(`venue-${option.id}`),
                            }}
                          />
                          <p className="font-black uppercase">{option.name}</p>
                          <p className="text-sm">{option.description}</p>
                          <p className="mt-1 text-xs font-bold uppercase">
                            Budget {option.effects.budget >= 0 ? "+" : ""}
                            {option.effects.budget} | Hype {option.effects.hype >= 0 ? "+" : ""}
                            {option.effects.hype} | Chaos {option.effects.chaos >= 0 ? "+" : ""}
                            {option.effects.chaos}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {phase === "bands" ? (
                  <section>
                    <h2 className="track-title">1) Choose Your Main Band</h2>
                    <p className="track-meta">Selected: {pendingBandIds.length} / 1</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {enabledBands.map((band) => {
                        const selected = pendingBandIds.includes(band.id);

                        return (
                          <button
                            key={band.id}
                            type="button"
                            className={`choice-card min-h-[180px] rounded border-2 border-black p-3 text-left ${
                              selected ? "bg-yellow-200" : "bg-white"
                            }`}
                            onClick={() => toggleBand(band.id)}
                          >
                            <div className="grid h-full grid-cols-2 gap-3">
                              <div
                                className="choice-art h-full min-h-[140px] w-full rounded border border-black bg-center bg-no-repeat"
                                style={{
                                  backgroundImage: band.image
                                    ? toBackgroundImage(band.image)
                                    : buildFallbackArt(`band-${band.id}`),
                                  backgroundSize: band.image ? "contain" : "cover",
                                  backgroundColor: "#fff",
                                }}
                              />
                              <div className="flex flex-col justify-center">
                                <p className="font-black uppercase">{band.name}</p>
                                <p className="text-sm">{band.description}</p>
                                <p className="mt-1 text-xs uppercase">Genre: {band.genre}</p>
                                <p className="mt-1 text-xs uppercase">
                                  Band Energy: B {formatSigned(band.effects.budget)} | H {formatSigned(band.effects.hype)} | C {formatSigned(band.effects.chaos)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="admin-btn mt-3"
                      disabled={pendingBandIds.length !== HERO_SELECTION_COUNT}
                      onClick={confirmBands}
                    >
                      Start This Band&apos;s Story
                    </button>
                  </section>
                ) : null}

                {phase === "local" ? (
                  <section>
                    <h2 className="track-title">3) Local Band Encounter {localBandIndex + 1}</h2>
                    <p className="track-meta">
                      {localBandQueue.length
                        ? `Round ${localBandIndex + 1} of ${localBandQueue.length}. Your social choices shape your rise.`
                        : "Meet the local scene."}
                    </p>
                    {currentLocalBand ? (
                      <>
                        <div className="rounded border-2 border-black bg-pink-50 p-3">
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,150px)_1fr] sm:items-center">
                            <div
                              className="choice-art h-24 w-full rounded border border-black bg-cover bg-center"
                              style={{
                                backgroundImage: currentLocalBand.image
                                  ? toBackgroundImage(currentLocalBand.image)
                                  : buildFallbackArt(`local-${currentLocalBand.id}`),
                              }}
                            />
                            <div>
                              <p className="font-black uppercase">You meet: {currentLocalBand.name}</p>
                              <p className="text-sm">{currentLocalBand.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3">
                          {localInteractionOptions.map((choice) => (
                            <button
                              key={choice.id}
                              type="button"
                              className="choice-card rounded border-2 border-black bg-white p-3 text-left"
                              onClick={() => chooseLocalInteraction(currentLocalBand, choice)}
                            >
                              <p className="font-bold">{choice.title}</p>
                              <p className="text-sm">{choice.description}</p>
                              <p className="text-xs mt-1 uppercase">
                                Budget {formatSigned(choice.effects.budget)} | Hype {formatSigned(choice.effects.hype)} | Chaos {formatSigned(choice.effects.chaos)}
                              </p>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p>No local bands available. Jumping to stage planning.</p>
                        <button type="button" className="admin-btn mt-3" onClick={() => setPhase("stage")}>
                          Continue
                        </button>
                      </>
                    )}
                  </section>
                ) : null}

                {phase === "stage" ? (
                  <section>
                    <h2 className="track-title">4) Stage The Chaos</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {enabledStageDesigns.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className="choice-card rounded border-2 border-black bg-white p-3 text-left"
                          onClick={() => chooseStageDesign(option)}
                        >
                          <div
                            className="choice-art mb-2 h-24 w-full rounded border border-black bg-cover bg-center"
                            style={{
                              backgroundImage: option.image
                                ? toBackgroundImage(option.image)
                                : buildFallbackArt(`stage-${option.id}`),
                            }}
                          />
                          <p className="font-black uppercase">{option.name}</p>
                          <p className="text-sm">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {phase === "promotion" ? (
                  <section>
                    <h2 className="track-title">5) Launch A Ridiculous Promo Plan</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {enabledPromotions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className="choice-card rounded border-2 border-black bg-white p-3 text-left"
                          onClick={() => choosePromotion(option)}
                        >
                          <div
                            className="choice-art mb-2 h-24 w-full rounded border border-black bg-cover bg-center"
                            style={{
                              backgroundImage: option.image
                                ? toBackgroundImage(option.image)
                                : buildFallbackArt(`promo-${option.id}`),
                            }}
                          />
                          <p className="font-black uppercase">{option.name}</p>
                          <p className="text-sm">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {phase === "problem" ? (
                  <section>
                    <h2 className="track-title">{problemStepNumber}) Crisis Round {problemRoundIndex + 1}</h2>
                    <p className="track-meta">
                      {problemQueue.length > 0
                        ? `Round ${problemRoundIndex + 1} of ${problemQueue.length}. Each response changes your final outcome.`
                        : "Handle the crisis and keep the show alive."}
                    </p>
                    <p className="track-meta">
                      Pressure Multiplier: x{getCrisisRoundMultiplier(problemRoundIndex, design?.difficulty ?? DESIGN_FALLBACK.difficulty).toFixed(1)}
                    </p>
                    {problemEvent ? (
                      <>
                        <p className="mt-2 font-bold uppercase">{problemEvent.title}</p>
                        <p className="text-sm">{problemEvent.description}</p>
                        <div
                          className="choice-art mt-2 h-28 w-full rounded border border-black bg-cover bg-center"
                          style={{
                            backgroundImage: problemEvent.image
                              ? toBackgroundImage(problemEvent.image)
                              : buildFallbackArt(`problem-${problemEvent.id}`),
                          }}
                        />
                        <div className="mt-3 grid gap-3">
                          {problemEvent.choices.map((choice) => {
                            const scaled = scaleEffects(
                              choice.effects,
                              getCrisisRoundMultiplier(
                                problemRoundIndex,
                                design?.difficulty ?? DESIGN_FALLBACK.difficulty,
                              ),
                            );

                            return (
                              <button
                                key={choice.id}
                                type="button"
                                className="choice-card rounded border-2 border-black bg-white p-3 text-left"
                                onClick={() => chooseProblemResolution(choice)}
                              >
                                <p className="font-bold">{choice.text}</p>
                                <p className="text-xs mt-1 uppercase">
                                  Budget {formatSigned(scaled.budget)} | Hype {formatSigned(scaled.hype)} | Chaos {formatSigned(scaled.chaos)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <p>No problem events are configured. Moving to ending.</p>
                        <button type="button" className="admin-btn mt-3" onClick={() => setPhase("ending")}>
                          Continue to Ending
                        </button>
                      </>
                    )}
                  </section>
                ) : null}

                {phase === "extra" ? (
                  <section>
                    {enabledExtraStages[extraStageIndex] ? (
                      <>
                        <h2 className="track-title">{6 + extraStageIndex}) {enabledExtraStages[extraStageIndex].title}</h2>
                        <p className="track-meta">{enabledExtraStages[extraStageIndex].prompt}</p>
                        <p className="text-sm mt-1">{enabledExtraStages[extraStageIndex].description}</p>
                        <p className="track-meta mt-1">
                          Branch step {extraStageIndex + 1} of {enabledExtraStages.length}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {enabledExtraStages[extraStageIndex].options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className="choice-card rounded border-2 border-black bg-white p-3 text-left"
                              onClick={() => chooseExtraStageOption(enabledExtraStages[extraStageIndex], option)}
                            >
                              <div
                                className="choice-art mb-2 h-24 w-full rounded border border-black bg-cover bg-center"
                                style={{
                                  backgroundImage: option.image
                                    ? toBackgroundImage(option.image)
                                    : buildFallbackArt(`extra-${option.id}`),
                                }}
                              />
                              <p className="font-black uppercase">{option.name}</p>
                              <p className="text-sm">{option.description}</p>
                              <p className="text-xs mt-1 uppercase">
                                Budget {option.effects.budget >= 0 ? "+" : ""}
                                {option.effects.budget} | Hype {option.effects.hype >= 0 ? "+" : ""}
                                {option.effects.hype} | Chaos {option.effects.chaos >= 0 ? "+" : ""}
                                {option.effects.chaos}
                              </p>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p>No extra stages configured. Moving to problem event.</p>
                        <button
                          type="button"
                          className="admin-btn mt-3"
                          onClick={() => {
                            if (!design) {
                              setPhase("ending");
                              return;
                            }

                            startProblemRounds(state, design);
                          }}
                        >
                          Continue
                        </button>
                      </>
                    )}
                  </section>
                ) : null}

                {phase === "ending" ? (
                  <section className="space-y-3">
                    <h2 className="track-title">{endingStepNumber}) Ending</h2>
                    <p className="text-lg font-black uppercase">
                      {ending?.title ?? "Chaotic But Fun"}
                    </p>
                    <div
                      className="choice-art h-32 w-full rounded border border-black bg-cover bg-center"
                      style={{
                        backgroundImage: ending?.image
                          ? toBackgroundImage(ending.image)
                          : buildFallbackArt(`ending-${ending?.id ?? "fallback"}`),
                      }}
                    />
                    <p>{endingSummary || "Your night lands somewhere between genius and emergency."}</p>
                    <p className="text-sm">{ending?.caption ?? "You survived. Mostly."}</p>

                    <div className="rounded border-2 border-black bg-zinc-100 p-3 text-sm">
                      <p><strong>Main Band:</strong> {mainBand?.name ?? "None"}</p>
                      <p><strong>Venue:</strong> {selectedVenue?.name ?? "None"}</p>
                      <p><strong>Local Bands Met:</strong> {selectedLocalBands.map((band) => band.name).join(", ") || "None"}</p>
                      <p><strong>Stage:</strong> {selectedStageDesign?.name ?? "None"}</p>
                      <p><strong>Promotion:</strong> {selectedPromotion?.name ?? "None"}</p>
                    </div>

                    <div className="rounded border-2 border-black bg-emerald-50 p-3">
                      <p className="text-xs font-black uppercase">Run Stats</p>
                      <p className="mt-1 text-sm font-bold uppercase">Final Grade: {performanceGrade}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                        <div className="rounded border border-black bg-white p-2">
                          <p className="text-xs uppercase">Total Rounds</p>
                          <p className="text-lg font-black">{completedRounds}</p>
                        </div>
                        <div className="rounded border border-black bg-white p-2">
                          <p className="text-xs uppercase">Crisis Rounds</p>
                          <p className="text-lg font-black">{problemQueue.length}</p>
                        </div>
                        <div className="rounded border border-black bg-white p-2">
                          <p className="text-xs uppercase">Local Encounters</p>
                          <p className="text-lg font-black">{selectedLocalBands.length}</p>
                        </div>
                        <div className="rounded border border-black bg-white p-2">
                          <p className="text-xs uppercase">Concert Score</p>
                          <p className="text-lg font-black">{concertScore}</p>
                        </div>
                        <div className="rounded border border-black bg-white p-2">
                          <p className="text-xs uppercase">Final Budget</p>
                          <p className="text-lg font-black">${state.budget}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 rounded border border-black bg-white p-2 text-xs font-bold uppercase">
                        <div className="delta-row">
                          <span>Budget Delta {formatSigned(netBudget)}</span>
                          <div className="delta-track">
                            <span
                              className={`delta-fill ${netBudget >= 0 ? "delta-positive" : "delta-negative"}`}
                              style={{ width: `${budgetDeltaWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className="delta-row">
                          <span>Hype Delta {formatSigned(netHype)}</span>
                          <div className="delta-track">
                            <span
                              className={`delta-fill ${netHype >= 0 ? "delta-positive" : "delta-negative"}`}
                              style={{ width: `${hypeDeltaWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className="delta-row">
                          <span>Chaos Delta {formatSigned(netChaos)}</span>
                          <div className="delta-track">
                            <span
                              className={`delta-fill ${netChaos <= 0 ? "delta-positive" : "delta-negative"}`}
                              style={{ width: `${chaosDeltaWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded border-2 border-black bg-sky-50 p-3 text-sm">
                      <p className="text-xs font-black uppercase">Full Decision Recap</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="rounded border border-black bg-white px-2 py-1">
                          <p className="text-xs font-bold uppercase">Best Move</p>
                          <p className="text-xs">
                            {bestDecision
                              ? `${bestDecision.step}: ${bestDecision.title}`
                              : "No decision data."}
                          </p>
                        </div>
                        <div className="rounded border border-black bg-white px-2 py-1">
                          <p className="text-xs font-bold uppercase">Most Questionable Move</p>
                          <p className="text-xs">
                            {worstDecision
                              ? `${worstDecision.step}: ${worstDecision.title}`
                              : "No decision data."}
                          </p>
                        </div>
                      </div>
                      {decisionLog.length ? (
                        <ul className="mt-2 space-y-1">
                          {decisionLog.map((entry) => (
                            <li key={entry.id} className="rounded border border-black bg-white px-2 py-1">
                              <p className="font-bold uppercase">{entry.step}: {entry.title}</p>
                              <p className="text-xs">{entry.detail}</p>
                              <p className="text-xs font-bold uppercase">
                                Budget {formatSigned(entry.effects.budget)} | Hype {formatSigned(entry.effects.hype)} | Chaos {formatSigned(entry.effects.chaos)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No decisions logged for this run.</p>
                      )}
                    </div>

                    <button type="button" className="admin-btn" onClick={replay}>
                      Play Again
                    </button>
                  </section>
                ) : null}
              </div>
            </div>
          </div>

          <style jsx>{`
            .adventure-shell {
              position: relative;
              isolation: isolate;
              background:
                radial-gradient(circle at 15% 18%, rgba(255, 204, 102, 0.33), transparent 38%),
                radial-gradient(circle at 82% 8%, rgba(52, 211, 153, 0.28), transparent 34%),
                radial-gradient(circle at 84% 84%, rgba(56, 189, 248, 0.2), transparent 38%),
                linear-gradient(180deg, #fffaf0 0%, #eefaff 100%);
            }

            .bg-orb {
              position: fixed;
              z-index: -1;
              border-radius: 999px;
              filter: blur(16px);
              pointer-events: none;
              opacity: 0.5;
              animation: orbFloat 9s ease-in-out infinite;
            }

            .orb-a {
              top: 5vh;
              left: 2vw;
              width: 16rem;
              height: 16rem;
              background: radial-gradient(circle, #fcd34d 0%, rgba(252, 211, 77, 0) 70%);
            }

            .orb-b {
              top: 30vh;
              right: 3vw;
              width: 18rem;
              height: 18rem;
              background: radial-gradient(circle, #34d399 0%, rgba(52, 211, 153, 0) 72%);
              animation-delay: 1.5s;
            }

            .orb-c {
              bottom: 2vh;
              left: 38vw;
              width: 14rem;
              height: 14rem;
              background: radial-gradient(circle, #f97316 0%, rgba(249, 115, 22, 0) 70%);
              animation-delay: 0.8s;
            }

            .adventure-panel {
              background: linear-gradient(145deg, #fffdf2 0%, #fff8e2 50%, #f6fbff 100%);
            }

            .stage-screen {
              min-height: 40rem;
              background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.9)),
                repeating-linear-gradient(
                  -45deg,
                  rgba(253, 186, 116, 0.08),
                  rgba(253, 186, 116, 0.08) 16px,
                  rgba(110, 231, 183, 0.08) 16px,
                  rgba(110, 231, 183, 0.08) 32px
                );
            }

            .adventure-header {
              background: linear-gradient(90deg, #fef08a 0%, #fdba74 45%, #86efac 100%);
              position: relative;
              overflow: hidden;
            }

            .adventure-header::after {
              content: "";
              position: absolute;
              inset: 0;
              background: linear-gradient(110deg, rgba(255, 255, 255, 0.18), transparent 42%);
              pointer-events: none;
            }

            .status-pill {
              background: rgba(255, 255, 255, 0.78);
              border: 1px solid #111;
              border-radius: 0.8rem;
              padding: 0.45rem 0.6rem;
              box-shadow: 2px 2px 0 #000;
            }

            .status-label {
              font-size: 0.63rem;
              line-height: 1;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              font-family: "Trebuchet MS", "Gill Sans", sans-serif;
              font-weight: 800;
            }

            .status-value {
              margin-top: 0.2rem;
              font-family: "Arial Black", Impact, sans-serif;
              font-size: 1rem;
              line-height: 1;
            }

            .meter-shell {
              margin-top: 0.35rem;
              height: 0.45rem;
              border: 1px solid #111;
              border-radius: 999px;
              overflow: hidden;
              background: rgba(15, 23, 42, 0.14);
            }

            .meter-fill {
              height: 100%;
              border-radius: 999px;
              transition: width 0.35s ease;
              animation: meterPulse 2.8s ease-in-out infinite;
            }

            .meter-budget {
              background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
            }

            .meter-hype {
              background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
            }

            .meter-chaos {
              background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
            }

            .phase-track {
              position: relative;
              padding-top: 0.35rem;
            }

            .phase-track-line,
            .phase-track-fill {
              position: absolute;
              left: 0.35rem;
              right: 0.35rem;
              top: 0.85rem;
              height: 0.2rem;
              border-radius: 999px;
            }

            .phase-track-line {
              background: rgba(17, 17, 17, 0.22);
            }

            .phase-track-fill {
              right: auto;
              background: linear-gradient(90deg, #f97316 0%, #14b8a6 100%);
              transition: width 0.35s ease;
            }

            .phase-track-list {
              position: relative;
              z-index: 1;
              display: grid;
              grid-template-columns: repeat(9, minmax(0, 1fr));
              gap: 0.2rem;
            }

            .phase-stop {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.22rem;
            }

            .phase-dot {
              width: 0.7rem;
              height: 0.7rem;
              border-radius: 999px;
              border: 2px solid #111;
              background: #fff;
              transition: transform 0.2s ease, background-color 0.2s ease;
            }

            .phase-dot.is-done {
              background: #14b8a6;
            }

            .phase-dot.is-active {
              background: #fb923c;
              transform: scale(1.2);
            }

            .phase-label {
              font-size: 0.52rem;
              line-height: 1;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              font-weight: 800;
            }

            .feedback-card {
              background: linear-gradient(180deg, #fefce8 0%, #ffffff 100%);
              box-shadow: 3px 3px 0 #000;
              animation: cardEnter 0.35s ease both;
            }

            .impact-chip {
              border: 1px solid #111;
              border-radius: 999px;
              background: #ffffff;
              padding: 0.15rem 0.5rem;
            }

            .story-beat-card {
              background: linear-gradient(130deg, #fff7ed 0%, #fffbeb 55%, #ecfeff 100%);
              box-shadow: 4px 4px 0 #000;
            }

            .story-art {
              position: relative;
              overflow: hidden;
            }

            .story-art::after {
              content: "";
              position: absolute;
              inset: 0;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 50%);
            }

            .story-art-tag {
              position: absolute;
              left: 0.45rem;
              bottom: 0.45rem;
              z-index: 1;
              border: 1px solid #111;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.92);
              padding: 0.1rem 0.45rem;
              font-size: 0.62rem;
              text-transform: uppercase;
              font-weight: 800;
              letter-spacing: 0.04em;
            }

            .choice-art {
              position: relative;
              overflow: hidden;
            }

            .choice-art::after {
              content: "";
              position: absolute;
              inset: 0;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 52%);
            }

            .choice-card {
              transition: transform 0.15s ease, box-shadow 0.15s ease;
              animation: cardEnter 0.3s ease both;
            }

            .choice-card:nth-child(2) {
              animation-delay: 0.04s;
            }

            .choice-card:nth-child(3) {
              animation-delay: 0.08s;
            }

            .choice-card:nth-child(4) {
              animation-delay: 0.12s;
            }

            .choice-card:hover {
              transform: translateY(-3px) scale(1.01);
              box-shadow: 4px 4px 0 #000;
            }

            .delta-row {
              display: grid;
              grid-template-columns: 1fr minmax(0, 145px);
              align-items: center;
              gap: 0.55rem;
            }

            .delta-track {
              position: relative;
              height: 0.5rem;
              border: 1px solid #111;
              border-radius: 999px;
              background: rgba(15, 23, 42, 0.13);
              overflow: hidden;
            }

            .delta-fill {
              display: block;
              height: 100%;
              border-radius: 999px;
            }

            .delta-positive {
              background: linear-gradient(90deg, #22c55e, #15803d);
            }

            .delta-negative {
              background: linear-gradient(90deg, #ef4444, #b91c1c);
            }

            @media (max-width: 640px) {
              .stage-screen {
                min-height: 0;
              }

              .phase-label {
                font-size: 0.46rem;
              }

              .status-value {
                font-size: 0.9rem;
              }
            }

            @keyframes orbFloat {
              0%,
              100% {
                transform: translateY(0px);
              }
              50% {
                transform: translateY(-12px);
              }
            }

            @keyframes cardEnter {
              from {
                opacity: 0;
                transform: translateY(6px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes meterPulse {
              0%,
              100% {
                filter: saturate(1);
              }
              50% {
                filter: saturate(1.22);
              }
            }
          `}</style>
        </section>
      </main>
    </div>
  );
}

