import { toISODate } from "@/lib/date";
import { ensureSchema, getSql } from "@/lib/db";

const DAILY_TURNS = 5;
const MAX_NAME_LENGTH = 24;
const POTION_HEAL = 12;
const POTION_COST = 12;

type PlayerRow = {
  id: number;
  player_name: string;
  name_key: string;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  potions: number;
  turns_left: number;
  last_turns_reset_date: string | Date;
};

type Enemy = {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  xpReward: number;
  goldReward: number;
};

export type GamePlayer = {
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

export type GameAction = "fight" | "rest" | "buy_potion" | "use_potion";

export type GameActionResult = {
  player: GamePlayer;
  lines: string[];
  action: GameAction;
};

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_NAME_LENGTH);
}

function toNameKey(name: string): string {
  return normalizeName(name).toLowerCase();
}

function mapPlayer(row: PlayerRow): GamePlayer {
  return {
    name: row.player_name,
    level: row.level,
    xp: row.xp,
    gold: row.gold,
    hp: row.hp,
    maxHp: row.max_hp,
    attack: row.attack,
    defense: row.defense,
    potions: row.potions,
    turnsLeft: row.turns_left,
  };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function xpToNextLevel(level: number): number {
  return 30 + (level - 1) * 20;
}

function buildEnemy(level: number): Enemy {
  const names = [
    "Dockside Ruffian",
    "Neon Alley Wolf",
    "Rusty Automaton",
    "Sewer Chimera",
    "Tape-Hiss Specter",
  ];

  const baseHp = 12 + level * 3;
  return {
    name: names[randomInt(0, names.length - 1)],
    hp: baseHp + randomInt(0, 6),
    attack: 4 + level + randomInt(0, 2),
    defense: 2 + Math.floor(level / 2),
    xpReward: 8 + level * 4 + randomInt(0, 4),
    goldReward: 5 + level * 3 + randomInt(0, 6),
  };
}

async function loadPlayerRow(nameKey: string): Promise<PlayerRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      player_name,
      name_key,
      level,
      xp,
      gold,
      hp,
      max_hp,
      attack,
      defense,
      potions,
      turns_left,
      last_turns_reset_date
    FROM rpg_players
    WHERE name_key = ${nameKey}
    LIMIT 1;
  `) as PlayerRow[];

  return rows[0] ?? null;
}

async function refreshDailyTurns(row: PlayerRow): Promise<PlayerRow> {
  const today = toISODate(new Date());
  const lastReset = toISODate(new Date(row.last_turns_reset_date));

  if (lastReset >= today) {
    return row;
  }

  const sql = getSql();
  const rows = (await sql`
    UPDATE rpg_players
    SET turns_left = ${DAILY_TURNS},
        last_turns_reset_date = ${today},
        updated_at = NOW()
    WHERE id = ${row.id}
    RETURNING
      id,
      player_name,
      name_key,
      level,
      xp,
      gold,
      hp,
      max_hp,
      attack,
      defense,
      potions,
      turns_left,
      last_turns_reset_date;
  `) as PlayerRow[];

  return rows[0] ?? row;
}

async function savePlayer(row: PlayerRow): Promise<PlayerRow> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE rpg_players
    SET
      level = ${row.level},
      xp = ${row.xp},
      gold = ${row.gold},
      hp = ${row.hp},
      max_hp = ${row.max_hp},
      attack = ${row.attack},
      defense = ${row.defense},
      potions = ${row.potions},
      turns_left = ${row.turns_left},
      updated_at = NOW()
    WHERE id = ${row.id}
    RETURNING
      id,
      player_name,
      name_key,
      level,
      xp,
      gold,
      hp,
      max_hp,
      attack,
      defense,
      potions,
      turns_left,
      last_turns_reset_date;
  `) as PlayerRow[];

  return rows[0] ?? row;
}

export async function getOrCreatePlayer(nameInput: string): Promise<GamePlayer> {
  await ensureSchema();

  const normalizedName = normalizeName(nameInput);
  const nameKey = toNameKey(nameInput);

  if (!normalizedName || normalizedName.length < 2) {
    throw new Error("Name must be at least 2 characters.");
  }

  const existing = await loadPlayerRow(nameKey);
  if (existing) {
    const refreshed = await refreshDailyTurns(existing);
    return mapPlayer(refreshed);
  }

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO rpg_players (
      player_name,
      name_key,
      turns_left,
      last_turns_reset_date
    )
    VALUES (
      ${normalizedName},
      ${nameKey},
      ${DAILY_TURNS},
      ${toISODate(new Date())}
    )
    RETURNING
      id,
      player_name,
      name_key,
      level,
      xp,
      gold,
      hp,
      max_hp,
      attack,
      defense,
      potions,
      turns_left,
      last_turns_reset_date;
  `) as PlayerRow[];

  const created = rows[0];
  return mapPlayer(created);
}

export async function getPlayer(nameInput: string): Promise<GamePlayer | null> {
  await ensureSchema();

  const nameKey = toNameKey(nameInput);
  if (!nameKey) {
    return null;
  }

  const row = await loadPlayerRow(nameKey);
  if (!row) {
    return null;
  }

  const refreshed = await refreshDailyTurns(row);
  return mapPlayer(refreshed);
}

export async function performGameAction(
  nameInput: string,
  action: GameAction,
): Promise<GameActionResult> {
  await ensureSchema();

  const nameKey = toNameKey(nameInput);
  const initial = await loadPlayerRow(nameKey);
  if (!initial) {
    throw new Error("Player not found. Create your character first.");
  }

  const player = await refreshDailyTurns(initial);
  const lines: string[] = [];

  if ((action === "fight" || action === "rest") && player.turns_left <= 0) {
    throw new Error("You are out of turns for today.");
  }

  if (action === "fight") {
    player.turns_left -= 1;

    const enemy = buildEnemy(player.level);
    let enemyHp = enemy.hp;
    let playerHp = player.hp;

    lines.push(`You challenge ${enemy.name}.`);

    for (let round = 1; round <= 5; round += 1) {
      const playerHit = Math.max(
        1,
        player.attack + randomInt(0, 5) + player.level - Math.floor(enemy.defense / 2),
      );
      enemyHp -= playerHit;
      lines.push(`Round ${round}: You hit for ${playerHit}.`);

      if (enemyHp <= 0) {
        break;
      }

      const enemyHit = Math.max(
        1,
        enemy.attack + randomInt(0, 4) - Math.floor(player.defense / 2),
      );
      playerHp -= enemyHit;
      lines.push(`${enemy.name} hits you for ${enemyHit}.`);

      if (playerHp <= 0) {
        break;
      }
    }

    if (enemyHp <= 0) {
      const goldGain = enemy.goldReward;
      const xpGain = enemy.xpReward;
      player.gold += goldGain;
      player.xp += xpGain;
      lines.push(`Victory! +${goldGain} gold, +${xpGain} XP.`);
    } else {
      const loss = Math.min(player.gold, randomInt(3, 9));
      player.gold -= loss;
      lines.push(`You retreat and drop ${loss} gold.`);
    }

    player.hp = Math.max(1, Math.min(player.max_hp, playerHp));

    let leveledUp = false;
    let needed = xpToNextLevel(player.level);
    while (player.xp >= needed) {
      player.xp -= needed;
      player.level += 1;
      player.max_hp += 4;
      player.attack += 1;
      player.defense += 1;
      player.hp = player.max_hp;
      leveledUp = true;
      needed = xpToNextLevel(player.level);
    }

    if (leveledUp) {
      lines.push(`Level up! You are now level ${player.level}.`);
    }
  }

  if (action === "rest") {
    player.turns_left -= 1;
    const heal = randomInt(6, 12);
    const before = player.hp;
    player.hp = Math.min(player.max_hp, player.hp + heal);
    lines.push(`You rest by the fire and recover ${player.hp - before} HP.`);
  }

  if (action === "buy_potion") {
    if (player.gold < POTION_COST) {
      throw new Error("Not enough gold for a potion.");
    }

    player.gold -= POTION_COST;
    player.potions += 1;
    lines.push(`You buy a potion for ${POTION_COST} gold.`);
  }

  if (action === "use_potion") {
    if (player.potions <= 0) {
      throw new Error("No potions available.");
    }

    if (player.hp >= player.max_hp) {
      throw new Error("You are already at full health.");
    }

    player.potions -= 1;
    const before = player.hp;
    player.hp = Math.min(player.max_hp, player.hp + POTION_HEAL);
    lines.push(`Potion used. Restored ${player.hp - before} HP.`);
  }

  const saved = await savePlayer(player);

  return {
    player: mapPlayer(saved),
    lines,
    action,
  };
}
