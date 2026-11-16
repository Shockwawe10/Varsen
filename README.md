# Varsen R1: demo landing page

**Live demo:** https://shockwawe10.github.io/Varsen/

A scroll-driven landing page for the Varsen R1, a carbon road bike. The bike is a real-time 3D model generated in the
browser with three.js: there are no photos or rendered images of it, only the model.

> **This is a demo.** Varsen is a concept brand made for this project. The R1 is not a real product and is not for
> sale.

## What the page does

- **Hero:** the assembled bike, which you can turn by dragging or with the arrow keys.
- **The build:** scrolling assembles the bike part by part, in the order a mechanic would.
- **In detail:** five points on the bike; choosing one flies the camera to that part and describes it.
- **Find yours:** enter your height or pick one of seven sizes (44 to 61), and the bike rebuilds itself at that size
  with its geometry drawn as a technical drawing.
- **Book a fitting:** a link to a booking calendar (Calendly), plus Facebook, Telegram and X links in the footer.

It also works without WebGL (pre-rendered posters) and without JavaScript (a readable page), and respects reduced
motion.

## Built with

- Plain HTML, CSS and JavaScript: no framework and no build step.
- [three.js](https://threejs.org/) r185, vendored in `vendor/`.
- The Archivo typeface (SIL Open Font License, `fonts/Archivo-OFL.txt`).

## Run it locally

Any static file server works. From the repository root, for example:

```
npx serve .
```

Then open the address it prints. Opening `index.html` straight from disk will not work, because the scripts are ES
modules.

## Project layout

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/`, `assets/`, `fonts/`, `vendor/` | The site (published as-is by GitHub Pages) |
| `js/bike.js` | The procedural bike model and its assembly |
| `js/app.js` | Scrolling, camera, rendering and the page's interactions |
| `tools/` | Browser checks (Playwright): parts never passing through each other, smooth scrolling, keyboard use, no-JS and no-WebGL fallbacks |
| `qa/` | Shared test helpers and the live-site check |
| `GEOMETRY.md`, `STORYBOARD.md` | The bike model's geometry and assembly spec |
| `scrollcraft/builds/varsen/` | The design brief and plan |
| `docs/3D-AND-DESIGN-GUIDE.md` | How to work with the 3D model, animation and design here, with every lesson learned |

## Sources

The frame geometry for all seven sizes is the published geometry of the Specialized Tarmac SL7 frameset (2022), as
listed by [Bike Insights](https://bikeinsights.com/). Rider heights per size come from a retailer's reference chart
(Bike Mart). The demo is not affiliated with either company.
