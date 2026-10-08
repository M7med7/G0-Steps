# ADR-0003: Read the pressure platform over USB with Web Serial, calibrate in the app

**Status:** Proposed (to confirm with the team)

**Date:** 2026-10-09

**Authors:** Mohammed Alharbi

---

## Context

The pressure hardware is the only scanning hardware bought so far: an ESP32-S3-N16R8 and 8× FSR402. The MVP needs real pressure readings to reach the app. The team also wants to show two things now, before the hardware is wired:
- how the system works end to end
- what the pilgrim sees versus what a doctor sees

Implementation-plan open question 3 (compute platform) is still open. For now the screen is a laptop or kiosk PC running the web app.

---

## Decision

1. **Connection: USB cable and Web Serial.** We chose it over a Wi-Fi WebSocket because:
   - there's no network setup
   - there are fewer ways to fail during a pitch
   - nothing on the board listens on a network
   It needs Chrome or Edge on a computer.
2. **Protocol:** the firmware prints one JSON line per frame, 20 times a second: `{"raw":[8 ADC values]}`. The sensor order is fixed in `SENSOR_ORDER` (`src/models/pressureProtocol.ts`) and `SENSOR_PINS` (firmware). Lines that don't parse, such as boot messages or lines cut off by a reset, are skipped.
3. **Calibration lives in the app, not the firmware.**
   - **Zero:** the empty-platform average.
   - **Reference:** each sensor's peak while it's pressed with the same reference weight.
   - **Load:** `(raw − zero) / (reference − zero)`, clamped to 0–1. It's relative load, never kPa (STANDARDS hard rule 5).
   - The calibration is stored in the browser's `localStorage`. It holds sensor numbers only, never personal data.
4. **A scan is a 4-second recording**, averaged per sensor. Fewer than 10 frames counts as "no data". A total load below 0.5 counts as "no feet". Each of these failures gets its own message.
5. **There are three sensor sources**, picked in the Demo drawer:
   - **Preset** scenarios (the original demo).
   - **Fake ESP32:** prints the same text lines as the firmware, with noise, and runs them through the same parser and calibration.
   - **ESP32 (USB).**
   Everything except a connected real board is labelled "Simulated data". The "Live sensors" badge appears only while the board is connected.
6. **Two result views:** what the pilgrim sees (`result`) and what the doctor sees (`doctor`). The doctor view shows:
   - the rules that fired
   - the six answers
   - every zone's load and the left/right gap
   - the data sources, with thermal and camera marked not connected
   It uses screening wording, not diagnosis.

---

## Consequences

### Positive
- The pipeline from bytes to risk result is the same for the fake and the real board, so demos exercise the real code.
- Recalibrating doesn't need a reflash, and the per-sensor reference absorbs differences between FSRs.
- The parsing, calibration and capture logic is pure and unit-tested. The fake device runs through it in tests.

### Negative
- It only works on Chrome or Edge on a computer. A tablet screen would need the Wi-Fi option later.
- The risk thresholds (`HIGH_LOAD`, `ASYMMETRY_GAP`) were tuned on invented scenarios. Real readings will need re-tuning, and the medical members still need to sign off the rules.
- The firmware is written but not yet compiled or run, because the hardware isn't wired.
- FSR402s may saturate under a standing adult. The resistor value and the supports layer matter (see `firmware/footguard-esp32/README.md`).

---

## Alternatives considered

- **Wi-Fi WebSocket from the ESP32:** works with tablets, but it needs network setup on site and adds failure points during a demo. Kept as a later option behind the same `PressureDevice` interface.
- **Calibration in firmware:** every change would need a reflash, and the app couldn't show calibration state.
- **Absolute pressure (kPa):** FSR402s aren't calibrated pressure sensors. Rejected by STANDARDS hard rule 5.

---

## References

- ADR-0001 (stack, MVC), ADR-0002 (3D view)
- `docs/STANDARDS.md` §3 (sensor seam)
- `firmware/footguard-esp32/README.md` (wiring, upload, calibration)
