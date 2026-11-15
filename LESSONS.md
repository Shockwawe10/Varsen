# Lessons

Written by /aar-loop after each session's After Action Review. Read this file before starting a new task in this project. Every entry should be concrete and checkable, never vague.

## 2026-11-11 -- A QA flag that locks behaviour (index.html?qa=1 locks adaptive quality) must be paired with at least one unlocked run that asserts on pixels (dark pixels inside __bike.layout.rect > 500 at p = 0, 0.5 and 1, plus one forced setQuality(1) at rest), or the locked path ships untested.
- Expected: Every visual QA check would cover what a visitor sees on the live site.
- Actual: On GitHub Pages the bike was blank at p = 1 after adaptive quality stepped down; the first live check still passed because it asserted __bike state, not pixels.
- Why: All screenshot tests used ?qa=1, so setQuality() -> renderer.setSize() (which clears the canvas) never ran in a pixel check, and setQuality() did not schedule a redraw. Fixed in ba00977: setQuality() calls kick(); regression test 'a quality change at rest redraws the bike'; qa/live-check.mjs counts bike pixels.
- tags: qa,webgl,adaptive-quality,fix-applied (rule also in .claude/skills/adaptive-render-quality/SKILL.md)

## 2026-11-11 -- When Lighthouse TBT regresses, the first step is: run lighthouse with --save-assets, list CrRendererMain RunTask events over 40 ms from its own trace (observed ms x 4 = simulated), then name the statement with long-animation-frame scripts[].sourceCharPosition (an offset into the inline module script). Any observed step over ~12 ms counts.
- Expected: Fixes for the detail-upgrade TBT regression (Lighthouse 90-93, TBT 312-419 ms) would each move TBT.
- Actual: Four guessed fixes (8 ms time-slicing, fewer shader programs, a software-GL path, text-wrap balance) moved TBT by less than 50 ms; one run of the saved trace found the 85 ms task.
- Why: I profiled a different environment (Playwright headless shell, my own longtask observer) instead of the scored run; Lighthouse labelled the task Unattributable. The cause was a 35 ms setRenderTarget(rt) during the PMREM warm-up plus canvas-text textures drawn in one go. Method recorded in .claude/skills/three-pmrem-async-warmup/SKILL.md.
- tags: performance,lighthouse,tbt,fix-applied

## 2026-11-11 -- When offering the user options that relax a brief constraint (here: a downloaded Sketchfab model versus the procedural bike), put each option's time estimate and its effect on every numeric budget (600 KB transfer, Lighthouse >= 90, frames < 20 ms) in the option description itself.
- Expected: The user would pick a direction once, from the AskUserQuestion options.
- Actual: The user picked 'Licensed downloaded model', I started vendoring loaders, then the user asked about time and budget and switched to the procedural route: one wasted round trip and an interrupted install to revert.
- Why: The options said 'likely adds several MB' but gave no time estimate and no number against the 600 KB budget; the comparison came only after the user asked.
- tags: communication,options,fix-applied (memory: options-state-costs.md)

## 2026-11-13 -- In a pinned scroll act, check that neither half of the screen goes bare at any p: the scroll-craft dead-scroll check passes as long as any pixel moves, so a 3D subject turning above a faded-out copy block reads as green. On the 390x844 contact sheet, inspect every pinned act's frames after its last copy cue ends.
- Expected: The Varsen hero (pin 1.8) would stay full while the bike turned to profile; the harness reported no dead scroll on every pass.
- Actual: The hero copy had data-sc-cue="0 0.6 0", so from p 0.6 to 1 (about 270 px of scroll on a phone) the bike turned above an empty lower half. I read the mobile sheet twice and called it fine; the owner found the gap on an iPhone. Fixed in 962c495 by removing the copy's cue.
- Why: The harness's dead-scroll rule only asks whether frames differ, and the turning bike made every frame differ. I looked at the sheet for collisions and clipping, not for empty area.
- tags: qa,scroll-craft,layout,mobile,fix-applied (CLAUDE.md Varsen section; tools/check-coverage.mjs fails on d4c47fd at p 0.60 to 1.00, bottom half 0.7%, and passes on HEAD)

## 2026-11-13 -- Before tuning scroll-driven motion, trace it (tools/check-smoothness.mjs) on the working tree and on HEAD (git archive HEAD, served on port 4502), with subject positions in plate-local coordinates; and grep the build for the rules of the project skill it implements. The Varsen loop passed dt = 0 on the first frame after idle, which the follow treated as snap-to-target, against damped-scroll-progress's own rule (first frame uses 1/60).
- Expected: The scroll easing (tau 0.17 s) would smooth every frame.
- Actual: Every scroll from rest jumped in one frame and the loop then stopped: 104 traced frames for 661 scrolled. My first trace recorded viewport coordinates, so page scroll swamped it (360,724 px/s2 on every plate) until I switched to plate-local. After the fix (c6f906b): build camera accel p95 38,171 to 1,774 px/s2, tour 105,154 to 15,414, dropped frames 10 to 0.
- Why: follow(k, v, consecutive ? dt : 0) plus 'if dt === 0 snap'; and the shared-canvas design meant the bike also trailed the browser's compositor scroll by a frame. The skill's rule was right; the build did not follow it and nothing checked it.
- tags: performance,scroll,smoothness,fix-applied (.claude/skills/damped-scroll-progress/SKILL.md, tools/check-smoothness.mjs, CLAUDE.md Varsen section)

## 2026-11-13 -- Commit and push each verified unit of work to main (ub-mode Commit and Push), and take every number in a commit message from a run on that exact tree; run a variance claim at least twice before writing it.
- Expected: Finished, verified work would be committed and pushed in small ordered commits, each saying why, what and how it was proved.
- Actual: The whole redesign sat uncommitted across sessions until the owner said I had 'forgot to push'. Then one message said 'mobile 90' from a stale Lighthouse run (re-measured 89, reworded before push), and c6f906b says 'run to run within about 10%' before any repeat run: a later repeat held p95 within 7% but one max moved 24%.
- Why: I treated 'not yet approved to replace the live root page' as 'do not commit', and wrote commit messages from memory of earlier measurements instead of the run on the tree being committed.
- tags: git,process,commit,fix-applied (memory: commit-and-push-per-ub-mode.md, CLAUDE.md Varsen section)

## 2026-11-14 -- Compare Varsen Lighthouse mobile only as interleaved HEAD/tree pairs, at least 4 of each (gzip servers on 4503 tree / 4504 HEAD archive); single runs on this machine swung from 81 to 97 on the same tree. To find what costs TBT, use the 2026-11-11 trace method (lighthouse --save-assets, RunTask events over 40 ms) instead of switching features off one at a time.
- Expected: Find what in the chain and badge change cost about 40 ms of simulated TBT and remove it.
- Actual: Feature toggles gave 82/87 (no badge) and 81/97 (no pins) on unchanged code, and a texture pre-upload made TBT worse (517, 522 against 425, 481). Only 4 interleaved pairs showed a stable answer (tree 86.75 against HEAD 87.75, then level after sharing the chain geometry).
- Why: Machine load changes over minutes, so back-to-back runs of one variant are not comparable; the 2026-11-11 lesson already named the trace method, but this session never re-read LESSONS.md after the context reset and fell back to toggling.
- tags: lighthouse,benchmarks,varsen,fix-applied (CLAUDE.md Varsen: Benchmarks)

## 2026-11-14 -- After any change to js/bike.js geometry, run tools/check-overlaps.mjs (not only the root qa/overlap.mjs) and tools/render-posters.mjs. The tightest gap in the model is the chain's outer plates to the neighbouring cogs: 0.1 mm (cogs 3.6 mm apart, 1.6 mm thick), so nothing on the chain may stand more than about 0.07 mm proud of the outer plates.
- Expected: Rivet heads 0.2 mm proud would clear everything; I had checked the gap to the derailleur cage (0.3 mm).
- Actual: check-overlaps found the drive-side heads 0.34 mm into the 14T's teeth at p 0.668; lowered to 0.07 mm, 0 pairs in all seven sizes.
- Why: I measured clearance against the part I was thinking about (the cage) and not the nearest one (the next cog). The scan caught it because it was run; CLAUDE.md names only the root site's overlap tool.
- tags: geometry,overlaps,varsen,fix-applied (CLAUDE.md Varsen: Geometry)

## 2026-11-14 -- A pointer-drag surface needs user-select: none and a cancelled dragstart, and its test must do two consecutive drags and one with the page scrolled (hero p 0.3): tools/check-drag.mjs test 4. A drawn angle of yaw x (1 - unwind) with yaw wrapped to +-pi jumps when it wraps; unwind the angle itself.
- Expected: The earlier drag fix (check-drag tests 1-3) had closed the hero drag bugs.
- Actual: The owner still saw the bike snap back when spinning with the page scrolled a little; reproducing it also showed the second drag died after one move (pointercancel).
- Why: Tests 1-3 all ran at p = 0 and each began from a fresh page, so neither the scaled-and-wrapped angle nor the selection left by a first drag (which the browser then drags as content) was ever exercised.
- tags: drag,pointer,varsen,fix-applied
