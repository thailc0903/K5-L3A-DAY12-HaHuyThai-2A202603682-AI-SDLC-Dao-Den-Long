# Changelog

## Phase 3 — Contract 1.2 — Breaking changes

- Replaced permanent lights with fuel (100 max, natural decay, refuel, extinction and five-mote relighting); snapshots add fuel/ever_lit/relit_count and player.capacity.
- Safe radius now requires fuel >=30; wandering shades seek weak lamps and can drain them, stacking five fuel/s each. Added drain state, target_lantern_id scenarios, refuel/lantern_out/fuel_drain events and lantern_lit.relight.
- Replaced immediate all_lit victory with survival to dawn and at least 60% lamps lit; reasons use dawn_survived/dawn/no_flames. Night durations changed to 240/270/300s.
- Replaced scoring: deposits/refuels +5, first light +100, relight +40, pulse +5 (drainer total +15), winning dawn lamp +50+floor(fuel), flame +50; removed time bonus and per_second_left tuning key.
- Capacity increases 10–20 with successful lights per night; scenario player accepts successful_lights. Existing fixed-capacity assumptions no longer apply.
- Added saved distinguishable palette, shade eyes/edges, white warning with symbol, fuel bars/blink and off-lamp squash/tear. Kept creative effects presentation-only.
- Updated affected tests with explicit reasons, ADR, v1.2 verification/evidence and CI; preserved Phase1–2 tags and evidence. Browser/GPU/audio QA remains pending.

## Phase 2 — Contract 1.1

- Applied Ticket-02 standard tuning, scoring and tick order; added dash, height checks, drops, recoil, falling/respawn and full pause.
- Added three exact terrain layouts, bridge/pads, physical tiers/ramps/tower and seeded wind/spawn schedules.
- Added Drifters, Wind Charms and their interactions; extended CLI/scenario/snapshot schema to v1.1.
- Added campaign/menu/intros/results/Dawn, persistent settings, original procedural music/SFX and complete HUD.
- Added optional browser-only constellation/particles/motif; never changes headless output.
- Expanded verification, headless fixtures, CPU scene construction checks and 21600-tick benchmark; preserved Phase1 tag/proof. Real browser/audio/FPS QA remains pending.

## Phase 1 — Contract 1.0

- Added original single-night 3D game, shared deterministic core, headless CLI, verification and proof.
- Preserved the original lab guides; product README lives in docs/game/README.md by the student's choice.
