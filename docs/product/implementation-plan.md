# FootGuard Hajj — Implementation Plan

> Status: pre-pitch. Sprint 0 active; Sprint 1 prototype built; Sprint 2 (real pressure) built in software, waiting for wired hardware; exam, action categories and languages built (ADR-0004), in team review. No fixed deadline. Last updated: 2026-10-14.

## 1. Executive Summary

FootGuard Hajj is a preventive foot-screening station for Hajj and Umrah pilgrims. A health volunteer guides the pilgrim through a 60–90 second check: risk questions, plantar pressure, and later thermal and visual scans. The volunteer scans the pilgrim's card and examines both feet (inspection, 10-g monofilament, pulses), then the pilgrim answers ten questions in their language and stands on the platform. The result is a foot map, one of five proposed action categories (low, moderate, high, urgent, incomplete; ADR-0004), recommendations, and the action the volunteer must take.

The philosophy is to move foot care from treating injuries after they happen to catching risk before. Primary users are diabetic, elderly and previously injured pilgrims. The near-term goal is a clickable software prototype the team can discuss (ADR-0001).

**Team roles:** a public-health advisor; software (IT/AI); medicine; public health (two members); monitoring and evaluation; mechatronics engineering.

## 2. Product Scope

### In scope for V1 (software prototype)
- **Languages:** staff screens in Arabic and English; pilgrim screens in 11 languages (ADR-0004), RTL-correct.
- **Card scan:** keyboard-wedge barcode scanner field; sample cards only until the real card format is known.
- **Volunteer exam:** 12 items in three groups (inspect, sensation and circulation, urgent signs), Yes / No / Not sure with foot side.
- **Questionnaire:** the team's 10 questions (2026-10-09 list, question 3 dropped), Yes / No / Not sure, foot side for symptoms, three follow-ups.
- **Scan-in-progress screen:** driven by `SimulatedSource`. Pressure is live-looking; thermal and RGB are labeled placeholders.
- **Results screen:**
  - Foot risk map with 8 pressure zones
  - Action category (Low / Moderate / High / Urgent / Incomplete)
  - 2–4 recommendations
  - Referral alert when High; urgent alert, with the scan skipped, when Urgent
  - Clinical report: category criteria, action required, fired rules with sources, exam findings, answers
  - QR code carrying a short, non-identifying summary
- **Volunteer view:** a list of today's screenings (simulated) with category, language and referral flag.
- **Scenario switcher:** four preset scenarios (Low, Moderate, High, Urgent) that fill the exam and answers for demos.

### Explicitly out of scope
- Thermal and camera input (Sprint 3; the hardware isn't bought). Pressure input is in scope from Sprint 2 (ADR-0003).
- Thermal or RGB image analysis, and any ML model
- Backend, accounts, cloud sync, storing real pilgrim data
- Clinical validation claims
- Kiosk hardware, enclosure, solar

## 3. Technical Architecture

Decided in ADR-0001 (revised 2026-10-06 to plain MVC).

- **App:** vanilla TypeScript (strict), client-only, built with Vite and tested with Vitest. Targets a 10" landscape touchscreen (1280×800) in a browser and reflows below 760px.
- **MVC layout:**
  - `src/models/`: domain types, questions, rules, `assessScreening()`, sample cards, scenarios, the screening log and `ScreeningStore` (immutable state with subscribers)
  - `src/views/`: pure render functions per screen and component, plus `KioskView` and `DemoPanelView` (the team's demo drawer), which own the DOM and patch it with `morphChildren`
  - `src/controllers/`: `AppController` (events, scan lifecycle) and `HashRouter`
  - `src/sensors/`: the `SensorSource` seam; `src/i18n/`: Arabic/English staff copy and 11 pilgrim locales; `src/styles/`: tokens and layout CSS
- **Sensor seam:** `SensorSource` interface, implemented first by `SimulatedSource`. A future `Esp32Source` will read pressure from the ESP32-S3 over Wi-Fi WebSocket (preferred) or Web Serial.
- **Rule engine:** pure function `assessScreening(answers, exam, pressure) → { category, refer, stopTesting, zoneFlags, recommendations, firedRules }`. All rules live in one file (`src/models/rules.ts`) with a citation or `illustrative` tag per rule.
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
- [x] `rules.ts` + `assessRisk()` with unit tests per rule and per scenario (replaced by `assessScreening()`, see below)
- [x] Screens: start → questionnaire → scan → results → volunteer list
- [x] Persistent "Simulated data / بيانات تجريبية" badge
- [ ] Shareable build link for team review (deploy target to decide)
- [ ] Team walkthrough; record decisions on questions, result audience and QR content

### Station 3D view [built, in team review]
- [x] `device.html`: interactive exploded view of the station's eight layers (ADR-0002)
- [x] Select a layer or camera to animate the camera in; explode/assemble; ar/en
- [ ] Mechatronics member confirms layer order, materials and parts
- [x] Replace the procedural model with a Blender model (`.glb`, layers named by id); procedural model kept as fallback
- [x] Realistic lighting: baked AO per layer, studio reflections, PBR Neutral tone mapping (ADR-0002 decision 5)
- [ ] Check frame rate on a real phone; decide on real-time shadows / screen-space AO

### Sprint 2 — Real pressure input [built in software; hardware not wired yet]
- [x] ESP32-S3 firmware: read 8 FSRs on ADC1, smooth, stream JSON lines over USB (`firmware/footguard-esp32`). Written, not yet compiled or run
- [x] App reads the board with Web Serial (`WebSerialDevice` + `DeviceSource`, ADR-0003). Instead of an automatic fallback, the source is picked explicitly: Preset / Fake ESP32 / ESP32 (USB)
- [x] Fake ESP32 that streams the real protocol through the same parser, for demos without hardware
- [x] Per-sensor calibration (zero + reference press) in the app; shows relative load, not kPa
- [x] Result tabs: what the pilgrim sees and what the doctor sees (rules fired, answers, zone loads, data sources)
- [ ] Wire the 8 FSRs (pins and resistor in the firmware README); first upload and serial check
- [ ] Calibrate on the real platform; check that sensors don't saturate under a standing adult
- [ ] Re-tune `HIGH_LOAD` / `ASYMMETRY_GAP` with real readings; medical members sign off the rules

### Exam, action categories and languages [built, in team review] (ADR-0004)
- [x] Six-step flow: card → volunteer exam → handover → 10 questions → scan → result and clinical report
- [x] Yes / No / Not sure with foot side; three follow-ups; urgent findings skip the scan
- [x] Five action categories from the team sheet, rules cite their sources or are tagged illustrative
- [x] Pilgrim screens in 11 languages (ar, en, ur, id, bn, hi, tr, fr, ms, ha, ru); all fit 1280×800
- [ ] Medical members review the category rules, especially the illustrative ones, and the dropped question 3
- [ ] Native speakers review the 9 draft translations (medical wording first)
- [ ] Time the full screening with the exam against the 60–90 s target
- [ ] Get the real pilgrim card format (Nusuk card or other) and decide what the station may read (PDPL)
- [ ] Decide whether a missing thermal reading should make a screening incomplete

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

1. **Domain constraints (not yet decided):** whether SFDA medical-device rules apply to a risk/referral tool, Personal Data Protection Law (PDPL) handling of pilgrim health data (more pressing now that the card shows name, age, sex and nationality), and infection control for a shared barefoot platform.
2. **Plantar imaging geometry:** the cameras can't see the sole while the pilgrim stands on the platform. Options: transparent window, separate lift step, or side views only.
3. **Compute platform:** ESP32-S3 alone can't realistically drive a 10" touchscreen, two cameras and analysis. ESP32 for sensors plus a tablet or Raspberry Pi?
4. **Clinical rule set:** which thresholds, from which sources, signed off by whom. Thermal 2.2°C asymmetry needs a protocol for pilgrims arriving from 50–70°C ground.
5. **Power:** AC 220V with battery backup (slide 14) or solar (renders)?
6. **Who operates and where:** volunteer-run (GASTAT 2026: 26,701 volunteers) at Mina camps, health points, or Haram entrances?
