# ADR-0001: Build a clickable software prototype with simulated sensor data first

**Status:** Proposed (to confirm with the team)

**Date:** 2026-10-06

**Authors:** Mohammed Alharbi

---

## Context

FootGuard Hajj (team STEPS | خطاك) is a preventive foot-screening station for Hajj pilgrims, pitched at the Hajj Innovation Camp (معسكر الحج الابتكاري). The concept combines four inputs:

- RGB foot image
- Thermal image
- Plantar pressure from 8× FSR402
- A 6-question risk questionnaire

These feed a decision-support step that outputs a foot risk map, a Low/Moderate/High score, recommendations and a referral alert. A health volunteer operates the station. The full concept is in `FootGuard_Hajj_Presentation.pptx.pdf`.

Facts as of this date:

- **Hardware:** only the pressure-scan parts are purchased (ESP32-S3-N16R8 + 8× FSR402 + wiring kit, 465 SAR). Thermal camera, RGB camera, display, enclosure and solar are concept renders.
- **Software:** none exists. The dashboard in the deck (slide 10) is a static mockup, and it shows things 8 FSRs can't produce: a dense kPa heatmap and a gait pattern.
- **Decision logic:** the deck commits to rule-based logic for the prototype and ML as later work. No rule thresholds are written down or clinically signed off yet.
- **Phase:** pre-pitch, with no fixed deadline. The team needs something concrete to discuss what the software should show and how the screening flow works.

Mohammed's immediate goal is a rough software prototype that shows how the screening experience and results would look, so the team can react to it.

---

## Decision

1. **The software comes before hardware integration.** Build a clickable prototype of the full screening flow driven by **simulated sensor data**: preset Low, Moderate and High scenarios. No dependency on the ESP32 being wired.
2. **Simulation sits behind one interface.** The app reads sensor readings through a single `SensorSource` interface. `SimulatedSource` ships first. A later `Esp32Source` (pressure over Wi-Fi WebSocket or Web Serial) replaces it without touching the screens.
3. **Pressure is shown honestly.** With 8 FSRs (4 per foot, proposed), the risk map shows **zones** colored by relative load. No continuous heatmap, no kPa values, no gait.
4. **The rule engine is explicit and replaceable.** Risk scoring is a small pure function over the inputs, with every rule in one file. Each rule carries a source citation or is marked `illustrative`.
5. **Stack:** vanilla TypeScript (strict) in an MVC structure, built with Vite and tested with Vitest. It runs in a browser sized for a 10" landscape touchscreen (1280×800), with Arabic and English and RTL from the start. No backend for the prototype.
   - *Revised 2026-10-06:* React was first proposed. It was dropped in favor of plain MVC: five screens don't need a framework, and an explicit model / view / controller split keeps the risk rules and sensor code independent of the UI.
   - **Models** (`src/models/`) hold domain types, the rules, risk assessment and the state store.
   - **Views** (`src/views/`) are pure render functions plus two view classes that own the DOM.
   - **Controllers** (`src/controllers/`) are the only place that handles events, timers and routing.

---

## Consequences

### Positive
- The team gets something to click through and argue about within days, not after hardware is ready.
- Flow and wording mistakes surface before anyone writes firmware.
- The `SensorSource` seam means the prototype becomes the real app instead of being thrown away.
- A static build can be shared as a link for remote team review.

### Negative
- Simulated data can make the product look more capable than it is. This is mitigated by a permanent on-screen "Simulated data" label (see STANDARDS.md).
- Hardware unknowns stay unresolved: plantar imaging geometry, FSR calibration, compute platform.

### Neutral but worth noting
- Thermal and RGB panels appear only as placeholders until those sensors exist.
- A built TypeScript project is heavier than a single HTML file. It was chosen because the prototype is expected to grow into the station app.

---

## Alternatives considered

- **Wire the ESP32 + FSRs first, UI later.** Rejected for now. The team's immediate need is a shared picture of the software, and the hardware path still has open design questions.
- **Static mockups only (Figma/slides).** Rejected. The deck already has a static mockup. A clickable flow tests timing, wording and the volunteer's role, which a picture can't.
- **Single static HTML file.** Viable for a one-off demo. Rejected because the code would be rewritten once real sensor input arrives.
- **React (or another UI framework).** Workable, but it adds a component model and dependencies the five screens don't need. MVC with plain TypeScript keeps the domain logic framework-free and easy to test.

---

## References

- `FootGuard_Hajj_Presentation.pptx.pdf`: slides 8 (solution), 15 (inputs), 16 (processing, rule-based now and ML later), 17 (outputs), 10 (dashboard mockup).
- Lavery et al., 2007: 2.2°C contralateral temperature difference as an ulcer-risk warning.
- Almqaiti et al., 2024: injury sites and comorbidities among pilgrims (Hajj 2023).
- GASTAT Hajj Statistics 2026; GASTAT Umrah Statistics Q1 2026.
