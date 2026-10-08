# FootGuard Hajj

Software for a preventive foot-screening station for Hajj and Umrah pilgrims. A health volunteer guides the pilgrim through six risk questions and a pressure scan on a sensor platform. The station then shows a foot risk map, a low / moderate / high risk level, preventive advice, and a referral when the pilgrim should see the medical team.

This repository holds the screening app prototype. Sensor readings are simulated for now. The hardware (ESP32-S3 with 8 FSR402 pressure sensors) will be connected in a later sprint.

## Run it

Requires Node 20.19+ or 22.12+.

```bash
npm install
npm run dev        # http://localhost:5173
```

The bar above the kiosk lets you jump between screens, load a low / moderate / high scenario, and switch between Arabic and English. You can also link to a screen directly, for example `#result`.

`device.html` (http://localhost:5173/device.html) is an interactive 3D exploded view of the station's eight layers, built with Three.js. Pick a layer in the list, on its label or in the model, and the camera moves in on it. The camera layer also lets you zoom in on each camera.

The station model is built in Blender from a script, `tools/blender/build_station.py`. To change it, edit the script, then rebuild and compress it (needs Blender 5.2):

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  --python tools/blender/build_station.py -- --out /tmp/station --export --render
npx @gltf-transform/cli@4 webp /tmp/station/station-raw.glb /tmp/station/station-webp.glb
npx @gltf-transform/cli@4 meshopt /tmp/station/station-webp.glb public/models/station.glb
```

`--export` also bakes each layer's ambient occlusion in Cycles (about 30 seconds on a recent Mac), and `--render` writes preview images to `/tmp/station`. Reflections on the page come from `public/env/studio.exr`, the CC0 "studio_small_01" image by Greg Zaal (Poly Haven) that ships with Blender. Keep the layer names in the script the same as the ids in `src/models/deviceLayers.ts`; the page checks them and falls back to the built-in model if one is missing.

```bash
npm test           # rule engine, store, sensor and copy tests
npm run typecheck
npm run build      # production build in dist/
```

## Structure

The app uses a plain MVC structure with no UI framework:

```
src/
  models/       domain types, risk rules, risk assessment, scenarios, state store
  views/        render functions for each screen and component, plus the view classes
  controllers/  input handling, scan lifecycle, routing
  sensors/      SensorSource interface and the simulated source
  i18n/         Arabic and English copy
  styles/       design tokens and layout
  scene/        Three.js model and scene for the 3D station view (device.html)
tools/blender/  script that builds the station model in Blender
public/models/  the exported station model (station.glb)
```

- The risk rules live in `src/models/rules.ts`. They are illustrative and not clinically validated.
- Decisions are recorded in `docs/decisions/`.
- The sprint plan is in `docs/product/implementation-plan.md`.
- Engineering standards are in `docs/STANDARDS.md`.

## Status

Pre-pitch prototype. Thermal and camera scanning are placeholders, the volunteer list uses invented sample data, and no real pilgrim data is stored anywhere.
