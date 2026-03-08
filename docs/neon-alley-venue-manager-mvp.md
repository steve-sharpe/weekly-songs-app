# Neon Alley Quest: Venue/Booking Manager MVP

## 1) Goal and vibe

Build a fun, lightweight local-music strategy game that doubles as promo for The Hulk Caesar Show.

Player fantasy:
- You are a St. John’s promoter trying to become the biggest name in town.
- You grow from small weeknight bookings into sold-out headline events.
- You win by balancing money, scene credibility, and audience hype.

Promo objective:
- Showcase real musical guests from the show as playable bands.
- Encourage players to discover guests and episodes through in-game results and rewards.

---

## 2) Core gameplay loop

One run is a "season" (4 in-game weeks).

Per in-game day:
1. Choose a venue for tonight.
2. Book 1 to 3 bands.
3. Spend on promotion.
4. Resolve the night (attendance, profit/loss, fame, scene cred).
5. Handle one random scene event.

End of week:
- Venue ranking update.
- Optional "Feature Night" challenge based on that week’s show theme.

End of season win condition:
- Hit fame target and successfully run one Headline Slot event.

---

## 3) MVP systems

### A) Bands
Each band has:
- Stage name
- Genre
- Draw (how many people they can bring)
- Fee (booking cost)
- Reliability (chance they perform well)
- Crowd energy (affects hype/fame)
- Show-link metadata (episode URL, clip URL)

### B) Venues
Each venue has:
- Name
- Capacity
- Base rent
- Genre affinity map
- Prestige level
- Risk factor (tech issues/noise complaints)

### C) Promotion
Simple promo packages:
- Posters
- Social boost
- Radio shoutout
- Street team

Each package increases attendance chance differently and costs budget.

### D) Scene events
Examples:
- Gear failure: attendance or energy penalty
- Surprise influencer: attendance bonus
- Weather warning: turnout penalty
- Guest interview buzz: fame bonus if booking featured artist

### E) Stats
Player stat model (MVP):
- Money
- Fame
- SceneCred
- FanTrust
- CurrentWeek
- DayInWeek

---

## 4) Suggested balancing (MVP defaults)

### Starting state
- Money: 300
- Fame: 0
- SceneCred: 0
- FanTrust: 50

### Band stat ranges
- Draw: 20 to 120
- Fee: 20 to 180
- Reliability: 55 to 95
- CrowdEnergy: 40 to 100

### Venue stat ranges
- Capacity: 60 to 500
- BaseRent: 30 to 220
- Prestige: 1 to 5

### Promo costs and effects
- Posters: cost 10, attendance multiplier +0.06
- Social boost: cost 20, attendance multiplier +0.12
- Radio shoutout: cost 35, attendance multiplier +0.18
- Street team: cost 50, attendance multiplier +0.24

### Economy defaults
- Avg ticket price baseline: 12
- Venue concession share to player: 2 per attendee when sold above 75% capacity

---

## 5) Night resolution formula (simple and transparent)

Use easy-to-tune components:

- bandDraw = sum of booked bands’ draw
- fitBonus = average genre fit between booked bands and venue
- promoBonus = sum of promo package multipliers
- reliabilityFactor = average reliability of booked bands
- noise = random between 0.88 and 1.12

attendancePotential = (bandDraw * (1 + fitBonus + promoBonus)) * (reliabilityFactor / 100)

attendanceRaw = attendancePotential * noise

attendance = clamp(round(attendanceRaw), 0, venue.capacity)

revenue = attendance * ticketPrice

costs = venue.baseRent + sum(band.fee) + promoSpend

profit = revenue - costs

fameDelta:
- +2 if attendance >= 60% capacity
- +5 if attendance >= 90% capacity
- +venue.prestige if sold out
- -2 if attendance <= 35% capacity

sceneCredDelta:
- +1 for each booked local guest artist
- +2 if genre fit >= 0.25
- -1 if no-show event triggers

fanTrustDelta:
- +2 for profitable night
- -3 for large loss (profit < -80)


## 6) Progression and win condition

Progression tiers by Fame:
- 0 to 19: Back Alley Booker
- 20 to 49: Downtown Promoter
- 50 to 89: Scene Staple
- 90+: Headline Power

Headline Slot unlock:
- Fame >= 90
- SceneCred >= 25
- FanTrust >= 55

Final win check:
- Successfully run a Headline Slot night (attendance >= 85% and profit >= 0)

---

## 7) UI flow (MVP)

### Screen 1: Game Hub
- Start/continue season
- Current stats summary
- This week’s featured guest card

### Screen 2: Day Planner
- Venue picker
- Band picker (up to 3)
- Promo picker
- Projected estimate card (attendance/profit risk)

### Screen 3: Night Result
- Attendance meter
- Profit/loss summary
- Fame/SceneCred/FanTrust changes
- Event card outcome line
- Optional "Watch this guest" CTA

### Screen 4: Week Summary
- 5-day recap table
- Best night highlight
- Suggested strategy for next week

### Screen 5: Season Finale / Headline Attempt
- Special high-capacity venue event
- Win/loss badge and shareable recap text

---

## 8) Content model tied to local bands and venues

### Minimum MVP content
- 10 to 16 bands (mostly from show guests)
- 5 venues (small, medium, big, prestige, wildcard)
- 8 random scene events
- 4 weekly featured-guest challenges

### Venue examples (placeholder names)
- Alley Room (small)
- Harbour Hall (medium)
- Downtown Electric (mid/high)
- Quidi Stage (high prestige)
- Signal Dome (headline-only)

---

## 9) Promo hooks for The Hulk Caesar Show

- "Featured guest this week" provides booking bonus if used.
- After a successful show with featured guest: show watch link to episode clip.
- Weekly challenge copy can mirror current show releases.
- End-of-season share message includes guest names and venue highlights.

Example recap text:
"I sold out Harbour Hall with [Guest Artist] and hit Headline Power in Neon Alley Quest."

---

## 10) Recommended admin tooling (extends current work)

Use /admin/game as the design center with extra sections:

1. Theme
- City name
- Flavor copy

2. Bands
- Add/edit guest artists
- Set draw, fee, reliability, crowd energy, genre
- Set episode/clip link

3. Venues
- Capacity, rent, prestige
- Genre affinity weights

4. Events
- Event description
- Trigger chance
- Effects (attendance, fame, cred, trust)

5. Weekly features
- Pick featured guests for promo bonuses

---

## 11) Data model draft (TypeScript)

```ts
export type GameBand = {
  id: string;
  stageName: string;
  genre: string;
  draw: number;
  fee: number;
  reliability: number;
  crowdEnergy: number;
  episodeUrl?: string | null;
  enabled: boolean;
};

export type GameVenue = {
  id: string;
  name: string;
  capacity: number;
  baseRent: number;
  prestige: number;
  genreAffinity: Record<string, number>; // -0.2 to +0.3
  enabled: boolean;
};

export type PromoPackage = {
  id: string;
  label: string;
  cost: number;
  attendanceBoost: number;
};

export type SceneEvent = {
  id: string;
  label: string;
  chance: number; // 0..1
  attendanceDelta?: number;
  fameDelta?: number;
  sceneCredDelta?: number;
  fanTrustDelta?: number;
};

export type BookingState = {
  money: number;
  fame: number;
  sceneCred: number;
  fanTrust: number;
  currentWeek: number;
  dayInWeek: number;
};
```

---

## 12) How this maps to current codebase

Current status:
- Existing game action loop already supports one-turn actions and persisted player state.
- Existing /admin/game editor already supports rival-oriented design data and save/load API.

Migration path:
1. Expand game-design config to include bands, venues, promo packages, events.
2. Replace current "fight" action with "run_show" action.
3. Add action endpoints for setup flow:
   - choose_venue
   - book_band
   - set_promo
   - run_show
4. Keep daily turn reset system as-is (fits game loop).
5. Keep all auth/admin patterns from existing admin routes.

---

## 13) MVP acceptance criteria

- Player can finish a full 4-week season.
- At least 10 local/guest bands are selectable.
- Venue choice, booking, and promo all materially affect attendance.
- End-of-night result clearly explains why player won/lost money and fame.
- Featured guest tie-in appears at least once per week.
- Headline slot can be unlocked and completed.

---

## 14) Post-MVP ideas

- Rival promoter AI each week
- Genre trend shifts by week
- Venue upgrades
- Co-op mode: two promoters compete on scoreboard
- Show-integrated monthly leaderboard
