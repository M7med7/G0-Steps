# FootGuard Hajj — Implementation Plan

> Status: pre-pitch. Sprint 0 active; Sprint 1 prototype built. No fixed deadline. Last updated: 2026-10-08.

## 1. Executive Summary

FootGuard Hajj is a preventive foot-screening station for Hajj and Umrah pilgrims. A health volunteer guides the pilgrim through a 60–90 second check: risk questions, plantar pressure, and later thermal and visual scans. The result is a foot risk map, a Low/Moderate/High risk level, preventive recommendations, and a referral alert when a medical review is needed.

The philosophy is to move foot care from treating injuries after they happen to catching risk before. Primary users are diabetic, elderly and previously injured pilgrims. The near-term goal is a clickable software prototype the team can discuss (ADR-0001).

**Team roles:** a public-health advisor; software (IT/AI); medicine; public health (two members); monitoring and evaluation; mechatronics engineering.

## 2. Product Scope

### In scope for V1 (software prototype)
- **Language and start screen:** Arabic and English, RTL-correct.
- **Risk questionnaire:** the deck's 6 questions. Diabetes? Previous foot injury? Current pain? Numbness? Current wound? Unusual footwear?
- **Scan-in-progress screen:** driven by `SimulatedSource`. Pressure is live-looking; thermal and RGB are labeled placeholders.
- **Results screen:**
  - Foot risk map with 8 pressure zones
  - Risk level (Low / Moderate / High)
  - 2–4 recommendations
  - Referral alert when High
  - QR code carrying a short, non-identifying summary
- **Volunteer view:** a list of today's screenings (simulated) with risk level and referral flag.
- **Scenario switcher:** three preset scenarios (Low, Moderate, High) for demos.

### Explicitly out of scope
- Real sensor input of any kind (Sprint 2+)
- Thermal or RGB image analysis, and any ML model
- Backend, accounts, cloud sync, storing real pilgrim data
- Clinical validation claims
- Kiosk hardware, enclosure, solar

## 3. Technical Architecture

Decided in ADR-0001 (revised 2026-10-06 to plain MVC).

- **App:** vanilla TypeScript (strict), client-only, built with Vite and tested with Vitest. Targets a 10" landscape touchscreen (1280×800) in a browser and reflows below 760px.
- **MVC layout:**
  - `src/models/`: domain types, questions, rules, `assessRisk()`, scenarios, the screening log and `ScreeningStore` (immutable state with subscribers)
  - `src/views/`: pure render functions per screen and component, plus `KioskView` and `ReviewBarView`, which own the DOM
  - `src/controllers/`: `AppController` (events, scan lifecycle) and `HashRouter`
  - `src/sensors/`: the `SensorSource` seam; `src/i18n/`: Arabic and English copy; `src/styles/`: tokens and layout CSS
- **Sensor seam:** `SensorSource` interface, implemented first by `SimulatedSource`. A future `Esp32Source` will read pressure from the ESP32-S3 over Wi-Fi WebSocket (preferred) or Web Serial.
- **Rule engine:** pure function `assessRisk(answers, readings) → { level, zoneFlags, recommendations, refer }`. All rules live in one file (`src/models/rules.ts`) with a citation or `illustrative` tag per rule.
- **Pressure layout:** 4 FSRs per foot, proposed at hallux, medial forefoot (1st metatarsal head), lateral forefoot (5th metatarsal head) and heel. This matches the most common injury sites (hallux 23%, forefoot ~11% each; Almqaiti et al.). The mechatronics member should confirm.
- **i18n:** all strings in `ar` / `en` dictionaries; no hard-coded UI text.

## 4. Sprint Plan

### Sprint 0 — Foundation [active]
- [x] Read deck + GASTAT 2026 sources; record context (this plan, ADR-0001, standards)
- [ ] Team confirms ADR-0001 (software-first, proposed stack)
- [ ] Medical members review the illustrative rule list before it goes on screen
- [ ] Confirm FSR placement (4 per foot) with the mechatronics member
- [ ] Apply the pitch fixes from the deck review (tracked separately)

### Sprint 1 — Clickable software prototype [built, in team review]
- [x] Scaffold Vite + TypeScript app (MVC) with ar/en + RTL
- [x] `SensorSource` interface + `SimulatedSource` with 3 scenarios
- [x] `rules.ts` + `assessRisk()` with unit tests per rule and per scenario
- [x] Screens: start → questionnaire → scan → results → volunteer list
- [x] Persistent "Simulated data / بيانات تجريبية" badge
- [ ] Shareable build link for team review (deploy target to decide)
- [ ] Team walkthrough; record decisions on questions, result audience and QR content

### Station 3D view [built, in team review]
- [x] `device.html`: interactive exploded view of the station's eight layers (ADR-0002)
- [x] Select a layer or camera to animate the camera in; explode/assemble; ar/en
- [ ] Mechatronics member confirms layer order, materials and parts
- [x] Replace the procedural model with a Blender model (`.glb`, layers named by id); procedural model kept as fallback

### Sprint 2 — Real pressure input [planned]
- [ ] ESP32-S3 firmware: read 8 FSRs on ADC1, smooth, stream JSON
- [ ] `Esp32Source` in the app; fall back to simulated when disconnected
- [ ] Simple per-sensor calibration (zero + reference weight); show relative load, not kPa

### Sprint 3 — Thermal and visual [blocked]
Blocked on the open questions below: plantar imaging geometry and compute platform.

## 5. Definition of Done

A sprint item is done when:
- It runs from a clean checkout with one documented command.
- Rule-engine changes have passing unit tests covering each risk level.
- Every user-visible string exists in both Arabic and English and renders correctly in RTL.
- Simulated data is visibly labeled wherever it appears.
- No real pilgrim data is committed or stored.
- The plan above is updated (checkbox and status).

## 6. Open Questions

Each becomes an ADR when resolved.

1. **Domain constraints (not yet decided):** whether SFDA medical-device rules apply to a risk/referral tool, Personal Data Protection Law (PDPL) handling of pilgrim health data, and infection control for a shared barefoot platform.
2. **Plantar imaging geometry:** the cameras can't see the sole while the pilgrim stands on the platform. Options: transparent window, separate lift step, or side views only.
3. **Compute platform:** ESP32-S3 alone can't realistically drive a 10" touchscreen, two cameras and analysis. ESP32 for sensors plus a tablet or Raspberry Pi?
4. **Clinical rule set:** which thresholds, from which sources, signed off by whom. Thermal 2.2°C asymmetry needs a protocol for pilgrims arriving from 50–70°C ground.
5. **Power:** AC 220V with battery backup (slide 14) or solar (renders)?
6. **Who operates and where:** volunteer-run (GASTAT 2026: 26,701 volunteers) at Mina camps, health points, or Haram entrances?
