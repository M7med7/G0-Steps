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
```

- The risk rules live in `src/models/rules.ts`. They are illustrative and not clinically validated.
- Decisions are recorded in `docs/decisions/`.
- The sprint plan is in `docs/product/implementation-plan.md`.
- Engineering standards are in `docs/STANDARDS.md`.

## Status

Pre-pitch prototype. Thermal and camera scanning are placeholders, the volunteer list uses invented sample data, and no real pilgrim data is stored anywhere.
