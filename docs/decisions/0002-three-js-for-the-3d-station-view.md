# ADR-0002: Use Three.js for an interactive 3D view of the station

**Status:** Proposed (to confirm with the team)

**Date:** 2026-10-08 (decision 3 revised and decision 5 added 2026-10-09)

**Authors:** Mohammed Alharbi

---

## Context

The team has an exploded concept render of the station showing its eight layers, from the transparent top down to the ABS outer shell. We want people to explore those layers themselves: pick a layer and have the camera move in on it, instead of looking at a static picture.

ADR-0001 set the stack as vanilla TypeScript in MVC with no UI framework. Browsers draw 3D through WebGL, and writing raw WebGL for this would be a lot of code for one page.

---

## Decision

1. **A second page, `device.html`,** built by Vite next to the screening app. The screening app does not load any of it.
2. **Three.js** (`three`) draws the model. We use only its core plus these add-ons: OrbitControls (drag and zoom), RoomEnvironment (studio-style reflections with no image download), CSS2DRenderer (HTML labels that follow the layers), and GLTFLoader with the meshopt decoder (loads the model file).
3. **The model is built in Blender from a script.** `tools/blender/build_station.py` builds the station in Blender (bevelled edges, cut-outs, PCB and perforation textures) and exports one compressed file, `public/models/station.glb` (about 420 kB). Each layer is a root node named by its `DeviceLayerId`, and each camera module is a node named by its `DevicePartId`. `src/scene/stationModel.ts` loads it and turns it into the same layer objects as before. If the file can't be loaded or a name is missing, the page falls back to the procedural model in `src/scene/deviceModel.ts`. The file is served from our own origin, so there are still no network calls beyond Google Fonts. The model is illustrative, based on the render, and not to scale.
   The script is the source of truth: no `.blend` file is kept. To change the model, edit the script, rebuild and re-export (see the README).
4. **MVC holds:** `models/deviceLayers.ts` has the layer list, the page state and the pure state transitions. `views/device/` renders the panel, and `scene/` is the 3D view. `DeviceController` handles all input.
5. **Lighting aims at the Blender previews:**
   - **Baked ambient occlusion.** The export step bakes contact shading in Cycles, one layer at a time with the others hidden, so it stays right when the layers pull apart. Each layer gets one 1024 px AO texture, stored in the `.glb` as the standard occlusion map.
   - **Studio reflections.** `public/env/studio.exr` is the CC0 "studio_small_01" image (Greg Zaal, Poly Haven) that ships with Blender and lights the previews, about 100 kB. If it fails to load, the scene uses three.js's built-in RoomEnvironment.
   - **PBR Neutral tone mapping.** We tried AgX to match Blender, but on the web it dulled the PCB and greyed the white shell. Neutral keeps them true.
   - We left out real-time shadows and screen-space AO for now, to protect frame rate on phones.

---

## Consequences

### Positive
- Anyone can explore the station's layers in a browser, in Arabic or English, on a laptop or a phone.
- The Blender model looks far closer to the render than shapes built in code, and the camera, labels and panel didn't change to use it.
- Because the model is a script, changes are reviewable diffs and the model can be rebuilt in seconds.

### Negative
- About 200 kB (gzipped) of extra JavaScript, plus the 1 MB model and the 100 kB studio image, loaded only on `device.html`.
- Baked AO is fixed per layer, so it can't react to the camera or to neighbouring layers. Layers don't shade each other when assembled.
- Rebuilding the model needs Blender 5.2 on the machine, and compressing it needs `npx @gltf-transform/cli@4`. The site itself doesn't.
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
