# Scenario versions

- `phase-2/`: active Contract v1.1 fixtures, used by scripts/verify.mjs. See cases.json for night, ticks, snapshot cadence and inputs.
- `win.json`, `win-inputs.json`, `hit.json` at this directory root: historical Phase1/Contract v1.0 fixtures. Run the historical proof by checking out tag `phase-1`; they are not claimed to produce their old results under v1.1 because carry/cost/scoring/maps changed.

The active suite keeps regression behaviour under the new standardized numbers. Replaced assumptions and tests are listed in docs/notes/phase-2-changes.md.
