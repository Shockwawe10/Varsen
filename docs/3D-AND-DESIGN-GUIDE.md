# Working with 3D models, animation and design

A field guide written from building the Varsen R1 site: a procedural three.js bike that assembles as you scroll,
turns under your finger, flies the camera to its parts and rebuilds itself at seven frame sizes. Every rule here
comes from something that went right or wrong on this project. Where a number is quoted, it was measured here.

It is written for whoever works on this project next (a developer, a designer or an AI agent), and for anyone
building a similar product page with live 3D.

**Contents**

1. [Ten rules](#1-ten-rules)
2. [Before you build: the brief](#2-before-you-build-the-brief)
3. [Building a 3D model in code](#3-building-a-3d-model-in-code)
4. [Materials, light and shadow](#4-materials-light-and-shadow)
5. [Animation](#5-animation)
6. [Interaction](#6-interaction)
7. [Rendering and performance](#7-rendering-and-performance)
8. [Page design](#8-page-design)
9. [Copy and honesty](#9-copy-and-honesty)
10. [Verification](#10-verification)
11. [Workflow, git and deploy](#11-workflow-git-and-deploy)
12. [Checklists](#12-checklists)
13. [Mistakes made here, and their fixes](#13-mistakes-made-here-and-their-fixes)

---

## 1. Ten rules

1. **Real numbers in, measured numbers out.** Build the model from a published spec, then measure the built model
   back against that spec and refuse to show it if they disagree.
2. **Nothing passes through anything.** Parts move like a workshop build. The only shared space allowed is a shaft
   turning in its bore, and a scan proves it at every point of the animation.
3. **State is a pure function of progress.** Scroll gives one number, `p`. Everything on screen is computed from `p`
   (and, for interaction, from a small explicit state), never accumulated frame by frame.
4. **Smooth means a spring, not a lag.** Every scroll-driven value follows its target on a critically damped spring,
   which starts and stops at zero speed.
5. **Render on demand.** Draw only when the picture changes. An idle page uses no GPU.
6. **Check pixels, not state.** A test that reads `ready === true` passes on a blank canvas. Count the pixels the
   visitor sees.
7. **Compare against HEAD.** Every performance or smoothness claim is "this tree against the previous one, on the
   same machine, interleaved", never a single run.
8. **Reproduce before you fix.** Write the test that fails on the current code first, then make it pass.
9. **One fact in one place.** Each figure appears once on the page, where it means the most.
10. **Commit each verified unit,** with why, what and how it was proved, and every number taken from a run on that
    exact tree.

---

## 2. Before you build: the brief

### 2.1 Interview first, in eight topics

The brief for this site (`scrollcraft/builds/varsen/BRIEF.md`) was built from eight questions. Ask them all before
writing code:

| Topic | What it decides | This project's answer |
|---|---|---|
| Vibe and references | The register of everything | "premium, trusted, editorial, modern, cinematic" |
| The journey | What the visitor sees first and last | Product first: the bike itself, on the first screen |
| Energy | Pace of motion | "mid between the calm and intense" |
| Feeling and the one moment | Where the peak is | The part-by-part build; later, the clickable "In detail" |
| Something no other site does | The signature move | "Rebuild at your size" from the real geometry chart |
| How far from minimal | Density | Premium editorial |
| One world or scenes | Structure | Distinct chapters, "not like a world that we'd be flying through" |
| Assets | What may appear | The bike model only: no generated imagery at all |

### 2.2 Record the owner's words verbatim

Quote the owner exactly, typos included, with the date, every time they change something. Later decisions get
checked against those words, and "what did they actually ask for?" is answerable in seconds. The brief here has a
revisions log of every request in the owner's own words.

### 2.3 When you offer options, state their costs

When offering choices that bend a constraint, put each option's **time estimate and its effect on every budget**
(transfer size, Lighthouse score, frame time) in the option itself. Here, an offer of "a licensed downloaded model"
said only "adds several MB"; the owner picked it, asked about cost after work had started, and switched to the
procedural model. One wasted round trip.

### 2.4 Decide the identity early, and keep it original

"Yellow and black like Lamborghini" became an original identity: yellow and black, gloss-yellow paint, no
Lamborghini name, bull, shield or typeface. Borrow a mood, never marks.

---

## 3. Building a 3D model in code

The bike is fully procedural: `js/bike.js` builds every part from numbers; nothing is loaded from a model file.

### 3.1 Why procedural

- **Size:** the whole bike is code plus three.js (744 KB vendored, cached once).
- **Truth:** geometry comes from the published chart, so the site can rebuild the bike at any of seven sizes.
- **Control:** every part has an origin, a pivot and an assembly path you choose.

Use a downloaded model when the brief needs photoreal detail that code can't reach in the time available; state the
cost in the options (2.3).

### 3.2 From spec to joints

1. **Write the spec as a document first** (`GEOMETRY.md`): the chart values, the derived joints, and the formulas.
   The QA parses it, so change the spec first and the code second.
2. **Derive joints in a pure function** (`deriveJoints(chart)`): chart in, named points out (BB, HTT, HTB, RA, FA,
   STT...). In millimetres, in the frame plane, origin at the bottom bracket.
3. **Build every part from those joints**, never from hand-placed numbers. A part that is "about here" breaks at the
   next size.
4. **Measure the built model** (`measureBuilt`) and **validate it against the chart** (`validateGeometry`):
   wheelbase, front centre and trail within 1 mm, head angle within 0.05°, the rest inside the chart's ranges. If
   validation fails, the page falls back to its posters instead of showing a wrong bike.

### 3.3 Units and structure

- **Units:** metres in the scene, millimetres in the spec; one constant (`MM = 0.001`) converts.
- **One group per part** (`frame`, `fork`, `wheelF`, `wheelR`, `drivetrain`, `handlebar`, `saddle`), each with its
  origin at its mounting joint, so the assembly animation is a transform of the group.
- **Moving sub-parts are their own bodies** (`userData.body = true`): the wheel's spinning hub, the crankset, the
  chain. The overlap scan treats each body separately.
- **Name every mesh.** The overlap scan, the fade system and the QA all find parts by name.

### 3.4 Shapes: which tool for which part

| Need | Tool | Example here | Watch out for |
|---|---|---|---|
| Tubes with real cross-sections | A sweep along points with a superellipse profile (`profTube`, `sweepGeometry`) | Aero head tube, down tube widening into the BB | Exponent `n` controls squareness (2 = ellipse, 2.3 to 2.8 = aero) |
| Flat parts with outlines | `ExtrudeGeometry` of a `Shape` | Chain plates, derailleur cage, chainring | A bevel grows both the outline and the thickness: draw the shape smaller |
| Turned parts | `LatheGeometry` | Rim profile, hub, chain rivets | **Point order sets winding.** Run the profile from the outer foot towards the axis; drawn the other way, every face points inward and is culled (the rivets were invisible until reversed) |
| Many identical parts | `InstancedMesh`, one shared geometry | 48 spokes, 224 chain plates, 224 rivets | Call `computeBoundingSphere()` and `computeBoundingBox()` after setting matrices, or culling is wrong |
| Gear teeth | A custom outline with a seat arc per tooth | Cassette, chainrings, jockey wheels | Phase the teeth so the chain's rollers sit in seats |

Skill notes for some of these live in `.claude/skills/` (`instanced-spokes`, for example).

### 3.5 Detail where it shows, lean where it doesn't

- **Look at the part at the size it appears.** A chain plate is about 6 px tall in the hero. The figure-of-eight
  outline and darker rivets read at that size; a rounded edge bevel did not, and it doubled the triangles.
- **Contrast beats geometry.** The rivets were invisible in near-white on light plates; in darker polished steel they
  read at once. Inner plates a shade darker than outer plates made the links alternate, as on a real chain.
- **Share geometry across variants.** The chain's plates and rivets are built once and shared by all seven sizes.
- **Count triangles against the previous version** before committing. Here: chain 47,040 (was 42,112), bike 159,340.
  A first, bevelled chain had 120k triangles and cost Lighthouse mobile about five points, because Lighthouse renders
  WebGL in software, where every triangle is main-thread time.

### 3.6 Clearances: check the nearest neighbour

- When you add anything that protrudes, compute the gap to **the nearest part**, not the part you happen to be
  thinking about. The rivets were checked against the derailleur cage (0.3 mm) and cut into the next cog (0.1 mm).
- The tightest gap in this model: chain outer plates to the neighbouring cogs, **0.1 mm**. Nothing on the chain may
  stand more than about 0.07 mm proud.
- Run the overlap scan (`node tools/check-overlaps.mjs`) after **any** geometry change. It tests every pair of bodies,
  triangle against triangle, at every point of the assembly, plus every size assembled.

### 3.7 Decals and lettering

- **Wrap decals onto the surface.** A flat card sinks into a curved tube. Set every vertex of the decal onto the
  tube's own cross-section, 0.7 mm proud (the down-tube wordmark, the R1 badge on the head tube).
- **Decide the reading direction.** Seen from ahead, the viewer's right is the bike's left: map the texture so it
  reads left to right from where it will be seen.
- **Size textures to their job.** Long thin strips need width (2048 px); a 34 mm badge needs 512. The text helper's
  fixed 2048 made the badge a 2048 x 1567 canvas: 12 MB to draw and upload, about 250 ms of blocking time on a phone.
- **Draw text textures in the page's own font**, measured from the font's cap height, so letters are never stretched.
- Decals use blending with `alphaTest`, no depth write, and polygon offset, so they never z-fight with the paint.

### 3.8 Logos as vectors

When a supplied logo is a rendered image (here, a generated gold-and-carbon mark), trace it as a flat vector:

1. Enlarge the image with a coordinate grid over it and read every corner.
2. Write the shapes as SVG paths in one flat brand colour; leave decorative fills (the carbon strip) empty.
3. Overlay the traced shape on the original at 50% in a contrasting colour; it must cover the original edge for edge.
4. Check it at 16, 32 and 48 px for the favicon.

---

## 4. Materials, light and shadow

### 4.1 Materials

- **One shared material per surface** (paint, carbon, alloy, steel, rubber, tape...), plus one shared "fade twin" per
  material for dissolves. Never one material per mesh.
- **Fades use alpha hashing, not blending.** Blended low-opacity geometry rendered differently from run to run on the
  GPU; hashed alpha is deterministic per pixel, so screenshot tests are stable.
- **Avoid mirror metal in a dark studio.** A fully metallic, smooth surface reflects black at most angles: the chain
  and rotors "went dark" as the bike turned. Use satin metals (part diffuse, metalness about 0.3, roughness about
  0.4) so the key light reads from every side.
- **Gloss paint:** physical material with clearcoat 1 and low clearcoat roughness; the arriving key light sweeping
  across it is the hero's opening moment.

### 4.2 Light

- A warm key and a cool rim light, plus a small room environment for reflections. The environment generation is
  costly at start-up; see 7.5.
- Animate light once, as an arrival (the key sweeps across the paint over 1.8 s), then leave it.

### 4.3 Shadow: render it from the model

A fixed blob or a line on the floor gives the bike away the moment it turns: it stays put while the bike moves.
The contact shadow here is rendered from the bike itself:

- An orthographic camera at floor level, looking up, renders the bike's height above the floor into two channels:
  contact `exp(-h / 0.035)` and soft occlusion `exp(-h / 0.55)`.
- Both are multiplied by each part's fade opacity, so a part fading in casts a shadow fading in.
- Blurred with separable blurs and drawn on a floor quad that fades at its own edges and the plate's edges.
- Start-up cost is spread out: compile the shaders asynchronously, then draw one part per task, so no single task is
  long.

---

## 5. Animation

### 5.1 The assembly is data

The build is a table of stages (`STAGES` in `js/bike.js`, mirrored in `STORYBOARD.md`): for each part, its window
in `p`, its start offset, its axis and its easing. The animation code reads the table; it doesn't contain choreography.

Rules for the stages:

- **Workshop order:** frame on the stand, fork up into the head tube, wheels, cranks through the bottom bracket, the
  chain last (once there is a ring and a cog to wrap), cockpit, saddle.
- **Physically plausible paths:** wheels roll in along the ground, cranks pedal forward as they land, the cockpit
  turns into line as it drops. The owner flagged wheels sliding in sideways and cranks turning backwards.
- **Nothing passes through anything at any `p`.** The overlap scan samples `p` adaptively so no vertex moves more than
  1 mm between samples.

### 5.2 Scroll to progress

- `pTarget` comes from the section's rectangle: `clamp01(-rect.top / (rect.height - innerHeight))`, read once at the
  top of the frame (read layout, then write; never interleave).
- The scroll listener is passive and only stores and schedules. No scroll hijacking, no `preventDefault`.

### 5.3 Damped, not lagged

Every scroll-driven value follows its target on a **critically damped spring**, solved exactly so it behaves the same
at any frame rate (`follow()` in `js/app.js`, `OMEGA = 10`: 90% of a step in 0.39 s, 99% in 0.66 s).

- A first-order lag jumps to full speed the instant the target moves; that is what a mouse-wheel notch looked like.
  The spring starts and stops at zero speed and never overshoots.
- **The first frame after idle uses dt = 1/60**, not 0. A `dt` of 0 was treated as "snap to target": every scroll
  from rest jumped in one frame and the loop stopped. Measured after the fix: build camera acceleration p95 38,171 to
  1,774 px/s², dropped frames 10 to 0.
- The build's camera follows a smoothed copy of its framing path, so framing changes never kink.
- Under reduced motion, values snap (no easing) and the hero camera holds its opening angle.

### 5.4 Time-driven flights

The "In detail" camera flights are driven by time, not scroll:

- Ease with smootherstep (`u³(u(6u − 15) + 10)`): zero speed and zero acceleration at both ends.
- Turn by the **shorter arc** (`((d % 360) + 540) % 360 − 180`), never the long way round.
- Interpolate distance **logarithmically**, so zooming in and out feel the same speed.
- Duration scales with the swing: `min(1300, 650 + swing × 3.2)` ms. Under reduced motion, 0.

### 5.5 Angles

- **Never scale a wrapped angle.** The hero drew `yaw × (1 − unwind)` with `yaw` wrapped to ±π: at half a turn the
  stored angle jumped from −π to +π, and the scaled drawing jumped most of the way back to straight. Unwind the angle
  itself instead: each step down the page takes the same share off what is left.
- Wrap with `atan2(sin a, cos a)`; compare angles with the shorter-arc difference.

### 5.6 Animation cost discipline

- Endless CSS animations cost scroll frames: the hotspot pulse dropped 5 frames per pass until it was gated to "the
  section is on screen and the page is still".
- Gate decorative motion on visibility and on scrolling; run it only while it can be seen.

---

## 6. Interaction

### 6.1 Drag to turn

- **Release speed from the last 80 ms only, and only from the run since the last change of direction.** A running
  blend of every move kept the old direction after a reversal and kept spinning after the finger stopped.
- **Held still before release: no fling.** Cancelled pointer: no fling.
- **No high-resolution redraw while the finger is down,** even if it is still; the swap read as a jump.
- **Make the surface unselectable and cancel `dragstart`.** The first drag selected the plate; the second press landed
  on the selection, the browser started its own drag-and-drop and sent `pointercancel`. The bike stopped after one
  move.
- `touch-action: pan-y` on the plate: horizontal drags turn the bike, vertical swipes still scroll.
- **Test two consecutive drags, and a drag with the page scrolled** (`tools/check-drag.mjs` test 4). Tests that start
  each drag from a fresh page at the top miss both bugs above.

### 6.2 Keyboard parity

Everything a pointer can do, the keyboard can: arrow keys turn the hero (15° a press); hotspots are buttons; Enter
opens a part, arrows step between parts, Escape returns to the whole bike with focus restored to the point.
`tools/check-keyboard.mjs` walks it.

### 6.3 Hotspots on a 3D model

- Project each anchor with the plate's own camera every time the view changes.
- **Choose each label's side by collision,** not by a fixed rule: try right and left, score each by how much it covers
  other points and labels already placed, and how much falls outside the plate. On a 390 px phone, labels fixed to the
  right ran Frame into Cockpit and Brakes into Drivetrain.
- **Measure the label's real size** (`offsetWidth`, `offsetHeight`) and add a margin. A guessed 22 px height (it is
  about 26) missed real overlaps.
- Hide points during a camera flight; show them once it lands.

### 6.4 External actions

- A booking link that is a plain `<a href>` works without JavaScript. The owner wanted it to open the calendar in a new
  tab, not embedded; ask how they want it before building an embed.
- Carry state into the hand-off where the service allows it (the chosen frame size goes to Calendly as `a1`).

---

## 7. Rendering and performance

### 7.1 Architecture: one renderer, a canvas per plate

- **One WebGL renderer, its canvas off screen.** Each plate (hero, build, detail, size chooser) has its own 2D canvas
  in the page; the bike is drawn with that plate's camera and state and copied in with `drawImage`.
- Why: a single fixed canvas drawn from script follows the page **one frame late** while the browser scrolls it on the
  compositor, so the bike trailed its own caption and dimension lines. Canvases in the page scroll with the page.
- A plate is redrawn only when its **signature** changes (size, light, camera, which bikes, their state), and half a
  screen before it arrives.

### 7.2 Adaptive quality

- Step the pixel ratio from measured frame intervals (an exponential moving average with hysteresis): touch devices
  `[1.5, 1.25, 1.0, 0.85]`, desktop `[2, 1.5, 1.25, 1.0]`, each capped at the screen's own ratio.
- Sample only consecutive animation frames: an idle gap is not a slow frame.
- **A quality change must schedule a redraw.** `setSize()` clears the canvas; without a redraw the live site showed a
  blank bike after a quality step.

### 7.3 Sharp at rest

- Motion frames draw at the adaptive level. **140 ms after the page settles,** plates on screen are drawn once more at
  full resolution: the screen's own ratio up to 3, at most 3.2 million pixels a plate (`REST_PX`), only where that
  is at least 1.2x the motion level.
- **On 1x and 1.25x screens, supersample on the GPU:** render at 2x into a multisampled render target, average each
  2x2 block in a shader, copy as usual. About 4 ms a pass. A first version that resized the drawing buffer and let the
  browser scale down cost 35 to 111 ms a pass and dropped frames.
- **three.js render-target colour trick:** three applies tone mapping and sRGB output only to the screen or an XR
  target. Flag the target `isXRRenderTarget = true` to get identical colour; set
  `texture.internalFormat = 'RGBA8'`, or the multisample resolve fails with sRGB storage and the plate comes out
  empty.

### 7.4 Render on demand

- One loop, scheduled by `kick()`; it keeps running only while something moves (a spring, a fade, a flight, a spin).
- Expose a `settled()` promise for tests: no frame pending and no high-resolution pass waiting.

### 7.5 Start-up

- **Compile shaders asynchronously** (`renderer.compileAsync`) before the first frame, for both the normal and the
  fade variants.
- **Environment maps:** `PMREMGenerator.fromScene` compiles heavy shaders synchronously (500 to 900 ms on a cold
  cache). Pre-create and async-compile its materials (`.claude/skills/three-pmrem-async-warmup`).
- **Yield between heavy steps** (`yieldToMain()`, one part per task) so no task is long.
- **Software WebGL counts:** Lighthouse and some low-end machines render in software. Triangles and texture sizes
  there are main-thread time.
- Pre-uploading every texture in its own task made things **worse** here (TBT 517 and 522 ms against 425 and 481).
  Measure each idea; don't assume.

### 7.6 Fallbacks

- **No WebGL:** pre-rendered posters of every plate (`node tools/render-posters.mjs`; re-run after any model,
  material or camera change).
- **WebGL context lost:** switch to the posters (the plates drop their focus stop for turning).
- **No JavaScript:** a complete readable page; the booking is still a working link.
- **Reduced motion:** no easing, no camera travel, no pulse; the information is all still there.

### 7.7 Budgets this site holds

| Measure | Value at last check |
|---|---|
| Lighthouse mobile | 86 to 88 (interleaved with HEAD 83 to 90) |
| Lighthouse desktop | 100 |
| Scroll frames dropped | 0 of about 1,200, wheel and trackpad, desktop and 3x phone |
| Page work per frame | about 2 to 3 ms at p95 |
| Bike triangles | 159,340 |

---

## 8. Page design

### 8.1 Structure

- **Product first:** the first screen is the bike, large, with one headline under it, never over it.
- **Chaptered editorial:** distinct chapters (the build, in detail, find yours, book a fitting), each one screen of
  meaning; a numbered folio for navigation.
- **One peak,** chosen by the visitor (clicking points on the bike), not forced by scroll.
- **A layer contract for the hero:** far (studio ground), mid (a huge low-contrast "R1" behind the bike), focal (the
  bike and its shadow), near (headline and action), atmosphere (the light). Each moves independently; nothing
  duplicates.

### 8.2 Pinned sections

- **Neither half of the screen may go bare at any scroll position.** A turning bike over a faded-out text block
  passes a "does anything move?" check but reads as a gap on a phone. `node tools/check-coverage.mjs` measures it.
- On iPhone Safari, size pinned stages from units that don't change when the address bar moves (`lvh`, `svh`), never
  `dvh` (`.claude/skills/ios-sticky-stage`).
- Give a scroll cue where scrolling is the interaction ("Scroll to see it built"), and a smaller one inside the build
  while parts are still to come.

### 8.3 Type, colour and identity

- One accent colour, owning regions rather than scattered: yellow `#ffc21a` on near-black, black ink on yellow.
- Display face for headings (Archivo Expanded), a text face for reading, numbers in tabular figures.
- No tilted type: the model line first ran up the right edge rotated; the owner could not see it. It moved to a solid
  "NEW" tag above the headline.
- Ask before changing the typeface: make three snapshots (here, simple PNGs were what the owner wanted, not a tool),
  and let the owner decide.

### 8.4 Technical drawings over a 3D view

The size chooser draws stack, reach and wheelbase over the bike as a technical drawing:

- **Draw dimension lines in screen space, exactly level or upright.** Projected from 3D, the camera's 5° azimuth and
  2° elevation tilted them a few pixels, and a 1 px line a few pixels off level stair-steps.
- Ends at the measured points' own screen positions; extension lines leave square to the dimension line.
- **Snap to the device-pixel grid of the layer the line is drawn in.** A 1 CSS px line is crisp on an even pixel
  ratio when its centre is on a device pixel boundary, on an odd ratio when it is on a device pixel's centre. The plate
  is a compositor layer placed on a whole pixel, so snap to the plate's own grid, not its page position (that left
  level lines two dim rows).
- Write coordinates with three decimals; two put 3x lines 0.01 px off.

### 8.5 Accessibility basics kept here

- Touch targets at least 44 px tall.
- A visible focus ring in every colour region (the yellow section's ring turns black).
- Decorative canvases `aria-hidden`; hotspots are real buttons with names; `aria-current` on the folio.
- `prefers-reduced-motion` honoured everywhere (5.3, 5.4, 7.6).

---

## 9. Copy and honesty

- **Speak as the product,** not as a demo of a technique. Remove "generated in your browser", "modelled", "solved
  link by link", "rebuilt from its chart". Describe the bike, not the code.
- **Only true claims.** No invented prices, weights, warranties, stock, dates or testimonials; no unbacked
  superlatives ("the most reliable" was left out: there was no data behind it).
- **One fact in one place.** The hero and the build chapter both described the build; the second became something
  else. The geometry chart and a separate chart chapter repeated each other; the chart chapter became an at-a-glance
  band.
- **Keep sources recorded** (in the brief and the README) even when the page doesn't show them.
- **Say "demo" where it belongs:** the README states this is a demo and Varsen is a concept brand.

---

## 10. Verification

### 10.1 The checks in this repo

Run from the repository root with the site served on port 4500
(`node .claude/skills/scroll-craft/scripts/serve.mjs --root . --port 4500`):

| Check | Proves |
|---|---|
| `tools/check-overlaps.mjs` | No part passes through another at any `p`, in all seven sizes |
| `tools/check-smoothness.mjs` | Frame pacing and camera acceleration while scrolling (wheel and trackpad); compare with HEAD |
| `tools/check-coverage.mjs` | No bare half screen in a pinned section |
| `tools/check-drag.mjs` | Release direction, no fling after a hold, no redraw under a finger, two strokes, scrolled drag |
| `tools/check-keyboard.mjs` | Keyboard walk of hero, points and size chooser |
| `tools/check-detail-clearance.mjs` | Camera flights never pass through the bike |
| `tools/check-no-js.mjs`, `tools/check-no-webgl.mjs` | The fallbacks are complete |
| `tools/render-posters.mjs` | Regenerates the no-WebGL posters |
| `qa/live-check.mjs chrome` / `webkit` | The deployed site shows the bike: paint pixels in every plate |

### 10.2 How to test well

- **Pixels, not state.** Count the bike's paint in a screenshot of each plate. A blank canvas fails.
- **Pair any test flag with an unlocked run.** `?qa=1` locks adaptive quality for determinism; one run without it
  must check pixels, including after a forced quality step.
- **Reproduce first.** Write the test, watch it fail on the current code, then fix. The drag test 4 failed before its
  fix and passed after.
- **Make a test strong enough to fail.** A first scrolled-drag test passed on broken code: the drag was too short to
  cross half a turn and its tolerance hid a 24% lag.
- **Screenshots can lie.** Clipping a screenshot at a fractional pixel resamples it and smears every horizontal line;
  a Playwright element screenshot taller than the viewport showed a blank iframe. Take full-viewport shots and crop.
- **Zoom with a grid** to read pixels and coordinates (`qa/tmp` scripts did this for the logo and the dimension lines).
- **Before and after side by side** for every visual change, at the size it is seen and close up.

### 10.3 Benchmarks

- **Lighthouse mobile only as interleaved pairs,** HEAD then tree, at least four of each. Single runs on this machine
  swung from 81 to 97 on the same code.
- **To find a blocking-time cost,** don't switch features off one at a time; read the trace: run Lighthouse with
  `--save-assets`, list main-thread tasks over 40 ms (observed ms x 4 = simulated), and name the statement.
- **Smoothness:** run `tools/check-smoothness.mjs` on the tree (port 4500) and on HEAD (`git archive HEAD` served on
  4502), and quote both.

---

## 11. Workflow, git and deploy

- **Read `LESSONS.md` before starting,** and again after a long session is condensed.
- **Commit each verified unit and push it.** Say why (the owner's words), what changed, and how it was proved. Every
  number in the message comes from a run on that exact tree; a variance claim needs two runs.
- **Stage files by name and check the commit** (`git show --stat HEAD`). A `git add` that aborted on one path left a
  move commit without its edited files.
- **Run an After Action Review** at the end of a session (what was supposed to happen, what happened, why, what
  changes) and write concrete lessons to `LESSONS.md`.
- **GitHub Pages publishes every tracked file.** No secrets in the repo: a Telegram bot needs only its public username
  for a link; a token pasted in chat should be revoked.
- **Renaming the repository moves the Pages address** (`/Bicycle_3D/` became `/Varsen/`) and the old address does not
  forward.
- **Before reporting a deploy as done,** wait for Pages to serve the new files, then run `qa/live-check.mjs` in Chrome
  and WebKit against the live address.

---

## 12. Checklists

### Adding or changing a part

- [ ] The spec (`GEOMETRY.md`) says where it goes; the code derives it from joints.
- [ ] It has a name, an origin at its mount, and its own body if it moves.
- [ ] Its nearest neighbour's gap is computed, not guessed.
- [ ] `node tools/check-overlaps.mjs`: 0 pairs, all sizes.
- [ ] Triangles counted against HEAD; textures sized to their job.
- [ ] Seen at its real on-screen size and close up, before and after.
- [ ] `node tools/render-posters.mjs` re-run.

### Adding or changing motion

- [ ] State is a function of `p` (or of a small explicit state for interaction).
- [ ] Scroll-driven values go through the spring; the first frame after idle uses 1/60.
- [ ] Angles: shorter arc, never a scaled wrapped angle.
- [ ] Reduced motion handled.
- [ ] Overlap scan if parts move; smoothness on tree and HEAD, quoted in the commit.

### Changing the page design

- [ ] One fact in one place; only true claims.
- [ ] Coverage check: no bare half screen; the 390x844 sheet read for empty areas, not just collisions.
- [ ] 360, 390 and 430 px phones, a tablet and desktop looked at.
- [ ] Keyboard, focus ring, 44 px targets.
- [ ] No-JS and no-WebGL checks.

### Deploying

- [ ] Committed in units, pushed.
- [ ] Pages serves the new files (fetch a changed file).
- [ ] `node qa/live-check.mjs chrome` and `webkit` pass on the live address.

---

## 13. Mistakes made here, and their fixes

| Symptom | Cause | Fix |
|---|---|---|
| Live bike blank after a while | A quality step resized the canvas (clearing it) without a redraw; tests used `?qa=1` and checked state | `setQuality()` schedules a redraw; the live check counts pixels |
| Scrolling from rest jumped in one frame | `dt = 0` on the first frame after idle meant "snap" | First frame uses 1/60 |
| Bike trailed its caption while scrolling | One fixed canvas, drawn from script, a frame behind the compositor | A 2D canvas per plate, scrolled by the browser |
| Empty half screen on iPhone in the hero | The copy faded out while the bike kept turning | Copy stays for the whole pin; coverage check added |
| Chain and rotors went dark as the bike turned | Mirror metal in a dark studio | Satin metals |
| A fixed shadow line stayed while the bike rolled | The shadow was a static blob | Contact shadow rendered from the bike |
| Drag flung the wrong way, or after holding still | Release speed blended every move | Last 80 ms, since the last change of direction |
| Bike snapped back when spun with the page scrolled | A wrapped angle was scaled by the unwind | Unwind the angle itself |
| Second drag stopped after one move | Selection drag-and-drop sent `pointercancel` | `user-select: none`, cancel `dragstart` |
| Rivets invisible | Lathe profile wound inward, faces culled | Profile from foot to centre |
| Rivets cut into the next cog | Clearance checked against the cage, not the cog | 0.07 mm proud; overlap scan |
| Lighthouse mobile down 5 points | 120k-triangle bevelled chain; a 2048 px badge texture | Lean chain, shared geometry; badge at 512 px |
| Dimension lines stair-stepped | Lines between projected 3D points, slightly off level | Screen-space axis-aligned lines, pixel-snapped to the layer grid |
| Hotspot labels overlapped on phones | Labels fixed to the right of each point | Side chosen by collision, from measured label sizes |
| Desktop bike looked soft | 1x screens rendered 1:1, the sharp pass only ran on dense screens | 2x supersampling on the GPU at rest |
| Commit missing its edited files | `git add` aborted on an already-staged path | Stage by name; check `git show --stat` |
