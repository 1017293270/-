# AGENTS.md

## Project Purpose

This project is a standalone scroll narrative homepage prototype inspired by Hubtown-style motion.
It is intentionally small and framework-free so future agents can inspect, modify, and run it quickly.

Current stack:

- `index.html` for page structure and CDN library loading.
- `styles.css` for responsive layout, visual system, and motion-ready CSS variables.
- `script.js` for scroll orchestration, Lenis setup, GSAP ScrollTrigger timelines, and canvas drawing.
- CDN dependencies: Lenis, GSAP, and GSAP ScrollTrigger.

## Collaboration Rules

- Keep the demo independently runnable by opening `index.html` directly or serving this folder with any static server.
- Prefer small, focused edits. Do not introduce a build step unless the task specifically needs one.
- Preserve the native fallback path in `script.js` for failed CDN loads and `prefers-reduced-motion`.
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
   - canvas background is visible,
   - reduced-motion mode still uses the fallback path.

## Current Architecture Notes

- Lenis owns smooth wheel behavior when available.
- GSAP ScrollTrigger owns chapter timelines when available.
- The custom `tick()` loop still runs for progress UI and canvas drawing.
- If GSAP is unavailable, `updateCards()` computes visibility from native scroll position.
- Canvas rendering is deliberately lightweight and should remain isolated from DOM animation logic.

## Recommended Next Step

The next meaningful upgrade is to replace the 2D canvas background with a small Three.js scene.

Suggested scope:

1. Add pinned Three.js CDN imports.
2. Move current canvas background logic into a separate `background2d` fallback module or clearly separated functions.
3. Add a Three.js scene with:
   - perspective camera,
   - central geometric object,
   - particle field,
   - subtle fog or depth color,
   - scroll-progress-driven camera position and object rotation.
4. Keep the current 2D canvas as fallback for failed Three.js loads or low-performance devices.
5. Update README with the new architecture and verification notes.

Do not jump directly into shader-heavy effects. First create a stable Three.js layer that follows
the existing scroll progress contract. Once that is verified, add material polish and post-processing.
