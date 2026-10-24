# FootGuard Hajj — Engineering Standards

Scope: the Sprint 1 software prototype. It's vanilla TypeScript (strict) in an MVC structure, built with Vite, tested with Vitest, and client-only (see ADR-0001). The 3D station view (`device.html`) adds Three.js (see ADR-0002). Update this file when the stack or scope changes.

## 1. Structure (MVC)

```
src/
  models/       domain types, questions + exam items, rules, risk assessment, scenarios, sample pilgrim cards,
                screening log, ScreeningStore,
                pressureProtocol (ESP32 line format + calibration)
  views/        pure render functions (screens/, components/) + KioskView, DemoPanelView, morph
  controllers/  AppController (events, scan lifecycle), HashRouter, DeviceController (3D view input)
  scene/        DeviceScene (WebGL canvas, camera, animations) + stationModel (loads the Blender .glb)
                + deviceModel (procedural fallback)
  sensors/      SensorSource + SimulatedSource (presets), DeviceSource (4 s capture),
                FakeDevice and WebSerialDevice (the ESP32 over USB), LineBuffer
  i18n/         staff copy (Arabic/English), locales/ (pilgrim copy in 11 languages), translate()
  styles/       tokens.css, base.css, demo-panel.css, kiosk.css, screens.css
```

- **Models** never touch the DOM, timers or `window`. Domain logic in `models/` is pure and unit-tested.
- **Views** turn state into markup. Render functions take a `ViewContext` and return a string. They never change state and never attach listeners. Interactive elements carry `data-action` attributes instead.
- `KioskView` draws a new screen fresh, so its enter animation plays. Updates within the same screen go through `morphChildren` (morphdom), which patches only what changed, so running animations (the scan beam, zone pings) aren't restarted. Give an element a `data-key` when a change should replace it and replay its animation (for example each question card).
- **Controllers** are the only code that listens to events, runs timers, reads sensors or changes the URL. The exception is device drivers in `sensors/`: they own their stream (the fake device's frame timer, the serial read loop), and the controller decides when to connect, capture or calibrate. Input from `data-*` attributes is validated with the type guards in `models/types.ts` before it reaches the store.
- Dependencies point inward: controllers → models and views; views → models (read-only); models → nothing outside `models/`.
- `scene/` is the view for the 3D page (`device.html`). It owns the canvas and its animations and never changes state; the camera controls are the one place a view listens to input, because Three.js's OrbitControls does that itself. Taps on the model go through `DeviceController`, which asks the scene what was hit.

## 2. Data model

These shapes live in `src/models/types.ts`. Screens never read sensors directly.

```ts
type Foot = 'L' | 'R';
type Zone = 'hallux' | 'medialForefoot' | 'lateralForefoot' | 'heel';
type Answer = 'yes' | 'no' | 'unsure';
type Response = { answer: Answer | null; side: 'L' | 'R' | 'both' | null }; // side only after a "yes"
type RiskAnswers = Readonly<Record<QuestionKey | FollowUpKey, Response>>; // 10 questions + 3 follow-ups
type ExamFindings = Readonly<Record<ExamKey, Response>>;                 // the volunteer's 12 exam items
type PressureMap = Readonly<Record<Foot, Record<Zone, number>>>; // relative load 0–1, NOT kPa

interface SensorReadings {
  source: 'simulated' | 'esp32';
  pressure: PressureMap;
  thermal: null;   // placeholder until a thermal sensor exists
  rgb: null;       // placeholder until a camera exists
  capturedAt: string;
}

interface ScreeningResult {
  category: 'low' | 'moderate' | 'high' | 'urgent' | 'incomplete'; // ADR-0004
  stopTesting: boolean;                 // urgent: no scan
  refer: boolean;
  zoneFlags: { foot: Foot; zone: Zone; reason: 'highLoad' | 'asymmetry' }[];
  recommendations: RecommendationKey[];  // keys into i18n, max 4
  firedRules: string[];                  // rule ids, for explainability
}
```

- No field holds a name, ID number, passport number, phone number or photo of a real person. The one exception is `PilgrimProfile` (from the scanned card): it lives in memory for one screening, is never stored, logged or put in the QR code, and the prototype only accepts the invented sample cards in `models/pilgrimCards.ts` (ADR-0004).
- `ScreeningStore` replaces its state object on every update; nothing is mutated in place. Derived values (such as the risk result) are computed by selectors, not stored.

## 3. Sensor seam

- All sensor data comes through `interface SensorSource { read(): Promise<SensorReadings> }`.
- **Sources:** the Demo drawer picks one of three (ADR-0003).
  - **Preset:** `SimulatedSource` takes a scenario and an injectable clock, so it returns deterministic readings for demos and tests.
  - **Fake ESP32** and **ESP32 (USB):** `DeviceSource` records a `PressureDevice` (`FakeDevice` or `WebSerialDevice`) for 4 s, averages the frames and applies the calibration.
- **The line format and sensor order** live only in `models/pressureProtocol.ts`, and the firmware must match them. The fake device prints the same lines, so it runs through the same parser.
- **Load is relative:** `(raw − zero) / (reference − zero)`, clamped to 0–1. The doctor view shows it as a percentage, never kPa.
- **Failed reads:** a failed read sets `sensorError` to its reason (`readFailed`, `noDevice`, `noData`, `noFeet`). The scan screen shows a matching message and a retry. Errors are never swallowed.
- **Labels:** the "Simulated data / بيانات تجريبية" badge shows whenever the source isn't the real board. "Live sensors" shows only while the real board is connected; otherwise it says the platform isn't connected.

## 4. Rule engine

- `assessScreening(answers, exam, pressure)` in `src/models/riskAssessment.ts` is a pure function: no I/O, no randomness, no dates. `pressure` is null when there is no reading.
- Categories follow the team's action-category sheet (ADR-0004). The highest applicable wins: urgent > high > incomplete > moderate > low. An urgent finding stops device testing, so the scan is skipped.
- Rules live only in `src/models/rules.ts`. Each one has an `id`, a `when`, a `level`, a `refer` flag, its recommendations, and either a citation or `source: 'illustrative'`.
- Thresholds are named constants (`HIGH_LOAD`, `RAISED_LOAD`, `ASYMMETRY_GAP`), never literals inside rules.
- `illustrative` rules are prototype-only. The medical members review them before any demo outside the team.
- Every rule has a unit test, and each preset scenario has a test asserting its expected level.

## 5. UI

- Design for 1280×800 landscape, and check every pilgrim screen fits in all 11 languages. Touch targets are at least 60 px (84 px for primary actions, 120 px for yes/no). Make sure it reads at arm's length.
- Support Arabic (default) and English. Use CSS logical properties so RTL works without overrides. The foot map is never mirrored.
- Anything a pilgrim reads (handover, questions, scan, result, shared components) lives in `src/i18n/locales/<lang>.ts`, one typed `LocaleStrings` file per language, so a missing string fails the type check. Staff-only copy (card, exam, clinical report, volunteer list) lives in `src/i18n/copy.ts` in Arabic and English. Tests fail if any string is empty or the placeholders differ.
- Languages other than Arabic and English are drafts (`reviewed: false` in `locales/meta.ts`) until a native speaker checks them. The screens don't label them; the review is tracked in the implementation plan.
- Pilgrim headings show the pilgrim's language with Arabic underneath for the volunteer (English if the pilgrim reads Arabic). Arabic and Urdu are right-to-left.
- The category is shown with text, an icon and color together, never color alone. Urgent is solid red; incomplete is neutral grey so it never reads as "fine".
- Wording is screening language only: "concern," "risk," "see the medical team." Never diagnosis or treatment.
- The pressure map shows 8 zones of relative load. No kPa, continuous heatmap, gait, arch index or foot type: 8 FSRs can't measure them.
- Colors and type come from `src/styles/tokens.css` only.

## 6. Code style

- TypeScript `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. No `any`.
- Exported functions and public methods have explicit parameter and return types.
- Any value that isn't a fixed copy string is escaped with `escapeHtml()` before it goes into markup.
- No `console.log` in committed code.

## 7. Security and privacy baseline (prototype)

- No backend and no network calls, apart from Google Fonts. The ESP32 connects over a local USB cable (Web Serial), and it only works after the person picks the port. Static files from our own origin (like `public/models/station.glb`) are fine.
- No real pilgrim data in the repo, in fixtures or in screenshots. Use invented records only.
- The QR code encodes the category, referral, flagged zones and a "simulated" marker only, with no identifiers or card data.
- Before any real person is screened: resolve implementation-plan open question 1 (SFDA, PDPL, infection control) and record it as an ADR.

## 8. Definition of Done checklist

- [ ] `npm run typecheck`, `npm test` and `npm run build` pass
- [ ] Rule changes have tests for every affected rule and all 4 scenarios
- [ ] New pilgrim strings exist in all 11 locales (staff strings in `ar` and `en`); RTL checked in the browser
- [ ] The simulated badge is visible wherever simulated data appears
- [ ] No identifiers or real data added
- [ ] `docs/product/implementation-plan.md` checkboxes updated
