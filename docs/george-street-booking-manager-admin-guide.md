# George Street Booking Manager Admin Guide

This guide explains how the game works and how to configure it for strong, stable results.

Recommended starting content size:
- Bands: 6 to 10
- Venues: 4 to 6

## 1. How The Game Works (Admin View)

Each in-game day, players:
1. Choose 1 venue.
2. Book 1 to 3 bands.
3. Add optional promo packages.
4. Run the show.

Core show logic:
- Attendance uses band draw, venue genre fit, promo boosts, reliability, and random noise.
- Revenue is ticket revenue plus concessions when the room is at least 75 percent full.
- Costs are venue rent plus band fees plus promo spend.
- Result updates player money, fame, scene cred, and fan trust.

Important mechanics:
- Ticket price scales with venue prestige.
- Sellout and high attendance give larger fame gains.
- Poor attendance and heavy losses can reduce stats.
- Featured Guest bonus applies only when the featured guest is in the booked lineup.
- Scene events are random and can add or subtract stats/cash.
- Season end is controlled by Weeks Per Season and Days Per Week.

## 2. Admin Setup Workflow (Best Practice)

Use this sequence in `/admin/game`:

1. Load Design
- Enter admin secret.
- Click `Load Design`.

2. Season Controls First
- Set season length and win thresholds before balancing content.
- Suggested starter values:
  - Weeks Per Season: 4
  - Days Per Week: 5
  - Win Threshold Fame: 90
  - Win Threshold Scene Cred: 25
  - Win Threshold Fan Trust: 55

3. Build Bands (6 to 10)
- Keep a spread of low, mid, and high power acts.
- Suggested distribution for 8 bands:
  - 2 low draw / low fee
  - 4 mid draw / mid fee
  - 2 high draw / high fee
- Suggested stat ranges (safe defaults):
  - Draw: 45 to 170
  - Fee: 35 to 210
  - Reliability: 60 to 90
  - Crowd Energy: 45 to 90

4. Build Venues (4 to 6)
- Include progression tiers so players can grow:
  - 1 small room
  - 2 mid rooms
  - 1 to 2 high-capacity or high-prestige rooms
- Suggested venue ladder:
  - Small: capacity 70 to 120, rent 25 to 60, prestige 1
  - Mid: capacity 140 to 260, rent 60 to 130, prestige 2 to 3
  - Large: capacity 300 to 520, rent 130 to 240, prestige 4 to 5

5. Set Genre Affinity Clearly
- Use realistic boosts by venue style.
- Good starting pattern:
  - Favorite genre: +0.12 to +0.20
  - Secondary genre: +0.06 to +0.12
  - Neutral: 0
  - Weak fit: -0.05 to -0.12
- Avoid extreme negatives at launch.

6. Promo Packages
- Keep 3 to 4 options, each clearly stronger and pricier.
- Suggested shape:
  - Low: cost 10 to 20, boost 0.05 to 0.10
  - Mid: cost 25 to 40, boost 0.11 to 0.18
  - High: cost 45 to 70, boost 0.19 to 0.28

7. Scene Events Editor
- Keep 5 to 8 enabled events.
- Mix positive and negative outcomes.
- Good chance bands per event:
  - Common: 0.10 to 0.18
  - Uncommon: 0.05 to 0.09
- Keep total enabled event chance pressure moderate to avoid chaos.

8. Featured Guest Bonus
- Enable this to promote current artists.
- Strong starting values:
  - Money Bonus: +15 to +30
  - Fame Bonus: +1 to +3
  - Scene Cred Bonus: +1 to +3
  - Fan Trust Bonus: +0 to +2

9. Simulate Night Before Saving
- Use `Simulate Night` with 3 lineup types:
  - Budget lineup in small venue
  - Balanced lineup in mid venue
  - Premium lineup in large venue
- Check that outcomes feel different but fair.

10. Save and Publish
- Click `Save Design` (autosave can still be on).
- Only use `Reset All Players` when you make major balance changes and want a clean season for everyone.

## 3. Recommended Starter Blueprint (8 Bands, 5 Venues)

Bands:
- 2 entry bands: draw 45 to 70, fee 35 to 70
- 4 core bands: draw 75 to 130, fee 75 to 150
- 2 headliners: draw 135 to 170, fee 160 to 210

Venues:
- 1 entry venue: cap 80, rent 30, prestige 1
- 2 growth venues: cap 160 to 220, rent 70 to 120, prestige 2 to 3
- 1 prestige venue: cap 320 to 420, rent 160 to 220, prestige 4
- 1 showcase venue: cap 450 to 550, rent 220 to 280, prestige 5

This setup usually creates clear progression without early dead-ends.

## 4. Fast Quality Checks

Run these checks after edits:

- Profit sanity:
  - Budget lineups should not always lose money.
  - Premium lineups should need good fit/promos to pay off.

- Attendance sanity:
  - Genre-fit lineups should visibly outperform mismatched lineups.

- Risk sanity:
  - Scene events should add flavor, not dominate every result.

- Win pace sanity:
  - Typical players should approach thresholds late in the season, not in week 1.

## 5. CSV Bulk Management

Bands CSV columns:
- `id,stageName,genre,draw,fee,reliability,crowdEnergy,enabled`

Venues CSV columns:
- `id,name,capacity,baseRent,prestige,enabled,genreAffinity`
- `genreAffinity` format uses `|` separator, for example:
  - `rock:0.15|indie:0.1|punk:-0.05`

Recommended workflow:
1. Export current CSV.
2. Edit in spreadsheet.
3. Import CSV back.
4. Run Simulate Night checks.
5. Save Design.

## 6. Troubleshooting

If players always lose money:
- Lower venue rent.
- Lower average band fees.
- Increase draw on mid-tier bands.
- Reduce negative scene event severity.

If players win too easily:
- Raise rent on high prestige venues.
- Increase fee on top 2 bands.
- Reduce top promo boost slightly.
- Raise win thresholds moderately.

If results feel random/noisy:
- Reduce extreme scene event deltas.
- Tighten genre affinity values.
- Keep reliability in a narrower mid-high band.

## 7. Launch Plan For Your Initial Content Size

For 6 to 10 bands and 4 to 6 venues:
1. Start with 8 bands and 5 venues.
2. Balance until Simulate Night feels stable.
3. Add 1 to 2 new bands only after a week of live play feedback.
4. Add a new venue only when mid-tier progression feels solved.

This keeps the economy readable and prevents early balance drift.
