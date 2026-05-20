# Hubtown Scroll Demo

A standalone scroll narrative homepage prototype at `D:\ui\hubtown-scroll-demo`.

## Usage

Open `index.html` directly in a browser.

## Current Implementation

- Full-screen sticky chapter sections.
- Lenis adds smooth wheel inertia when the CDN is available.
- GSAP ScrollTrigger drives scrubbed chapter timelines, text reveal, movement, scale, and navigation state.
- Three.js r128 renders the primary background scene with a perspective camera, central geometry, particle field, grid, fog, and scroll-driven movement.
- A 2D canvas background remains available as a fallback when Three.js cannot load or reduced motion is enabled.
- Mobile view shortens scroll sections while keeping the core rhythm.
- If Lenis, GSAP, or Three.js cannot load, the page falls back to the native scroll-progress controller and/or 2D background.
- `prefers-reduced-motion` is respected for nonessential motion and also uses the fallback controller.

## Upgrade Path

- Add subtle post-processing only after performance checks are stable.
- Split the script into modules if the prototype grows beyond a single-file demo.
- Move CDN libraries into a bundler if this becomes part of a production app.
