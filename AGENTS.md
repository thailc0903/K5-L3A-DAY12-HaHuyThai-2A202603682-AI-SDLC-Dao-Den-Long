# Đảo Đèn Lồng — Phase 1

- Scope: PRD-0 and Test Contract v1.0 only; see docs/notes/phase-1-spec.md.
- Runtime: Node.js 20+; no package installation or network needed to play/test.
- Build check: `node scripts/check.mjs`. Play: `node scripts/serve.mjs`.
- Verification gate: `node scripts/verify.mjs`. Do not report completion if this exits nonzero.
- Headless: `node scripts/headless.mjs --seed 12 --night 1 --ticks 600 --out test-output/run.jsonl`.
- Keep all gameplay in src/game.mjs; browser code renders and forwards inputs only.
- Use game.contract.json tuning for both browser and headless. Tick zero precedes input.
- Do not fabricate proof, edit generated JSONL/TAP manually, or claim unrun browser/platform tests passed.
- Update assumptions and tests together when requirements change. Keep the original lab guides.
- Before a phase tag: run the gate, inspect the diff, and record limitations including any pending independent student review. Lab deadlines allow tagging an unfinished phase when documented honestly.
- Do not add later phase features or external assets beyond licensed Three.js.
