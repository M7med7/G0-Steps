# ADR-0002: Use Three.js for an interactive 3D view of the station

**Status:** Proposed (to confirm with the team)

**Date:** 2026-10-08

**Authors:** Mohammed Alharbi

---

## Context

The team has an exploded concept render of the station showing its eight layers, from the transparent top down to the ABS outer shell. We want people to explore those layers themselves: pick a layer and have the camera move in on it, instead of looking at a static picture.

ADR-0001 set the stack as vanilla TypeScript in MVC with no UI framework. Browsers draw 3D through WebGL, and writing raw WebGL for this would be a lot of code for one page.

---

## Decision

1. **A second page, `device.html`,** built by Vite next to the screening app. The screening app does not load any of it.
2. **Three.js** (`three`) draws the model. We use only its core plus three add-ons: OrbitControls (drag and zoom), RoomEnvironment (studio-style reflections with no image download) and CSS2DRenderer (HTML labels that follow the layers).
3. **The model is procedural for now.** `src/scene/deviceModel.ts` builds each layer from simple shapes, so the page needs no asset files and no network calls beyond Google Fonts. It is illustrative, based on the render, and not to scale.
4. **MVC holds:** `models/deviceLayers.ts` has the layer list, the page state and the pure state transitions. `views/device/` renders the panel, and `scene/` is the 3D view. `DeviceController` handles all input.

---

## Consequences

### Positive
- Anyone can explore the station's layers in a browser, in Arabic or English, on a laptop or a phone.
- Swapping in a real model from Blender later only replaces `deviceModel.ts`. The camera, labels and panel stay the same.

### Negative
- About 160 kB (gzipped) of extra JavaScript, loaded only on `device.html`.
- OrbitControls listens to pointer input itself, so the 3D view is the one view that handles input. Taps that change state still go through `DeviceController`.
- The surface colours of the 3D parts are constants in `deviceModel.ts`, not `tokens.css` tokens, because WebGL materials can't read CSS variables.

### Neutral but worth noting
- The physical layer order, materials and parts come from the concept render. The mechatronics member should confirm them before the model is treated as the design.

---

## Alternatives considered

- **Raw WebGL:** no dependency, but several thousand lines for lighting, picking and camera control.
- **Babylon.js:** capable, but bigger, and more engine than this page needs.
- **React Three Fiber:** needs React, which ADR-0001 dropped.
- **Spline embed:** quick to make, but hosted elsewhere, harder to control from our code, and adds network calls.

---

## References

- ADR-0001 (stack, MVC)
- The team's exploded concept render of the station (shared in the 2026-10-08 session)
