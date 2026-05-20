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
- 2D canvas rendering remains the fallback path and should stay isolated from DOM animation logic.

## Recommended Next Step

The next meaningful upgrade is to polish the Three.js scene without making it shader-heavy.

Suggested scope:

1. Add a small performance panel or debug flag for renderer status.
2. Add per-chapter scene states for color, camera depth, and object composition.
3. Add a lightweight image or environment texture only if it improves the story.
4. Consider splitting `script.js` into `scroll.js`, `background-three.js`, and `background-2d.js` if the next change grows the file further.
5. Add a Playwright verification script if this becomes more than a visual prototype.

Do not jump directly into shader-heavy effects. Keep the current scroll progress contract stable:
DOM chapters, progress UI, Three.js background, and 2D fallback should all read the same progress state.
