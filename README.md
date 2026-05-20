# Hubtown Scroll Demo

A standalone scroll narrative homepage prototype at `D:\ui\hubtown-scroll-demo`.

## Usage

Open `index.html` directly in a browser.

## Current Implementation

- Full-screen sticky chapter sections.
- Lenis adds smooth wheel inertia when the CDN is available.
- GSAP ScrollTrigger drives scrubbed chapter timelines, text reveal, movement, scale, and navigation state.
- Canvas background simulates a WebGL visual layer with particles, perspective grid, and rotating geometry.
- Mobile view shortens scroll sections while keeping the core rhythm.
- If Lenis or GSAP cannot load, the page falls back to the native scroll-progress controller.
- `prefers-reduced-motion` is respected for nonessential motion and also uses the fallback controller.

## Upgrade Path

- Replace the canvas with Three.js for camera, material, particle, and post-processing control.
- Move CDN libraries into a bundler if this becomes part of a production app.
