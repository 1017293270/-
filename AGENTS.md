# AGENTS.md

## Project Purpose

This project is a standalone scroll narrative homepage prototype inspired by Hubtown-style motion.
It is intentionally small and framework-free so future agents can inspect, modify, and run it quickly.

Current stack:

- `index.html` for page structure and CDN library loading.
- `styles.css` for responsive layout, visual system, and motion-ready CSS variables.
- `script.js` for scroll orchestration, Lenis setup, GSAP ScrollTrigger timelines, Three.js rendering, and 2D fallback drawing.
- CDN dependencies: Lenis, GSAP, GSAP ScrollTrigger, and Three.js r128.

## Collaboration Rules

- Keep the demo independently runnable by opening `index.html` directly or serving this folder with any static server.
- Prefer small, focused edits. Do not introduce a build step unless the task specifically needs one.
- Preserve the native fallback path in `script.js` for failed CDN loads and `prefers-reduced-motion`.
- Preserve the 2D canvas fallback when changing Three.js behavior.
- Keep visual motion purposeful: scroll should communicate chapter progress, depth, and transitions.
- Do not remove accessibility labels, keyboard-focus states, or reduced-motion handling.
- Use ASCII in source files unless a task specifically requires localized copy.
- Avoid hardcoded magic numbers when adding new motion behavior; use named constants near the top of `script.js`.
- If adding libraries, document why in `README.md` and keep CDN versions pinned.

## Verification

Before handing off changes:

1. Run JavaScript syntax validation:

   ```powershell
   node --check .\script.js
   ```

2. Open the page through a local static server or directly in a browser.
3. Verify desktop and mobile widths.
4. Confirm there are no browser console errors.
5. Scroll through all chapters and check:
   - active navigation dot changes,
   - chapter text enters and exits,
   - Three.js background is visible when the CDN loads,
   - 2D canvas fallback is still visible if Three.js is disabled,
   - reduced-motion mode still uses the fallback path.

## Current Architecture Notes

- Lenis owns smooth wheel behavior when available.
- GSAP ScrollTrigger owns chapter timelines when available.
- The custom `tick()` loop still runs for progress UI and canvas drawing.
- If GSAP is unavailable, `updateCards()` computes visibility from native scroll position.
- Three.js rendering is the primary background path.
- `SCENE_STATES` in `script.js` is the source of truth for per-chapter 3D camera, material, light, particle, and grid behavior.
- 2D canvas rendering remains the fallback path and should stay isolated from DOM animation logic.

## Recommended Next Step

The next meaningful upgrade is to improve maintainability and observability before adding more visuals.

Suggested scope:

1. Split `script.js` into `scroll.js`, `background-three.js`, and `background-2d.js`.
2. Add a small debug/status panel behind a query flag such as `?debug=1`.
3. Add a Playwright verification script so browser checks are repeatable.
4. Add a lightweight image or environment texture only if it improves the story.
5. Add subtle post-processing only after performance checks are stable.

Do not jump directly into shader-heavy effects. Keep the current scroll progress contract stable:
DOM chapters, progress UI, Three.js background, and 2D fallback should all read the same progress state.
