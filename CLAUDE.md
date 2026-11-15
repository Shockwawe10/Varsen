# Bicycle 3D (Varsen R1 site)

Read LESSONS.md before starting work.

The site is the Varsen build at the repository root (`index.html`, `css/`, `js/`, `assets/`, `fonts/`, `vendor/`).
GitHub Pages publishes `main` as-is at https://shockwawe10.github.io/Varsen/ (the repository was renamed from
Bicycle_3D to Varsen on 2026-11-15; the old Pages address does not forward). The build's brief and plan stay in
`scrollcraft/builds/varsen/` (BRIEF.md, PLAN.md); its old address there forwards to the root. The original one-stage
page was removed on 2026-11-15 (git history has it).

- **Serve:** `node .claude/skills/scroll-craft/scripts/serve.mjs --root . --port 4500`. The checks are in `tools/` and
  run from the repo root.
- **The bike model's spec:** GEOMETRY.md and STORYBOARD.md. `qa/tests/spec-data.mjs` parses both, and
  `tools/check-overlaps.mjs` reads the designed fits from GEOMETRY.md section 6, so change the spec first.
- **No bare half screen:** in a pinned act, neither half of the screen may go bare at any scroll position. Run
  `node tools/check-coverage.mjs`, and on the 390x844 sheet look at each pinned act's frames after its last copy cue.
  The scroll-craft dead-scroll check passes while anything moves.
- **Motion:** after any change to scroll-driven motion, run `node tools/check-smoothness.mjs` on the working tree
  (port 4500) and on HEAD (`git archive HEAD`, served on port 4502), and quote both in the commit.
- **Benchmarks:** compare Lighthouse mobile only as interleaved HEAD/tree pairs, at least 4 of each, the HEAD copy
  from `git archive HEAD`; one run swings 81 to 97 here. To find a TBT cost, use the trace method in LESSONS.md
  (2026-11-11), not feature toggles.
- **Geometry:** after any change to `js/bike.js` geometry, run `node tools/check-overlaps.mjs` and
  `node tools/render-posters.mjs`. No part may pass through another at any p; the only shared space is a shaft in its
  bore (GEOMETRY.md section 6). The chain's outer plates sit 0.1 mm from the neighbouring cogs.
- **Before reporting a deploy as done,** run `node qa/live-check.mjs chrome` and `node qa/live-check.mjs webkit`.
  Both count the bike's paint in screenshots of every plate, not just the page state.
- **Playwright's Windows WebKit** cannot present a resized WebGL canvas (`qa/probe/resize.html`). WebKit visual tests
  use `?qa=1`; the canvas-resize path is verified in Chrome.
- **Secrets:** nothing secret goes in the repo; Pages publishes every tracked file. The Telegram link uses the bot's
  public username only.
- **Commit and push** each verified unit of work to main (`.claude/skills/ub-mode`). Every number in a commit message
  comes from a run on that exact tree; run a variance claim twice before writing it.
