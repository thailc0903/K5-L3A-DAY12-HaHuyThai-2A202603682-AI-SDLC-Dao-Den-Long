# Đảo Đèn Lồng — Phase 3

- Scope: PRD-0 + Ticket-02 + Ticket-03, Contract v1.2; see docs/notes/phase-3-adr.md. Do not implement later tickets.
- Runtime: Node.js 20+; no package installation or network needed to play/test.
- Build check: `node scripts/check.mjs`. Play: `node scripts/serve.mjs`.
- Verification gate: `node scripts/verify.mjs`. Do not report completion if this exits nonzero.
- Full unit suite: `node --test tests/game.test.mjs tests/presentation.test.mjs tests/scene.test.mjs`. CPU scene tests are not GPU/FPS/audio proof.
- Headless: `node scripts/headless.mjs --seed 12 --night 2 --ticks 1200 --out test-output/run.jsonl` (nights 1–3).
- Keep all gameplay in src/game.mjs; browser code renders and forwards inputs only.
- Use game.contract.json tuning and src/rules.mjs for both runtimes. Preserve the Ticket-02 update order with fuel decay/drain/out in step 2; paused ticks advance tick, not sim_tick.
- Do not fabricate proof, edit generated JSONL/TAP manually, or claim unrun browser/platform tests passed.
- Update assumptions and tests together when requirements change. Keep the original lab guides.
- Before a phase tag: run the gate, inspect the diff, and record limitations including any pending independent student review. Lab deadlines allow tagging an unfinished phase when documented honestly.
- Old evidence and the phase-1/phase-2 tags are immutable. Record replaced tests and changed assumptions. Creativity belongs in browser-only visuals/audio, with a switch to disable it for comparison.
