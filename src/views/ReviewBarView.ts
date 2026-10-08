import logoUrl from '../assets/logo.webp';
import { SENSOR_ORDER } from '../models/pressureProtocol';
import type { AppState } from '../models/ScreeningStore';
import { SCENARIO_NAMES, SCREENS, SENSOR_MODES, type DeviceStatus, type Language, type ScenarioName, type ScreenName, type SensorMode } from '../models/types';

const SCREEN_LABELS: Readonly<Record<ScreenName, string>> = {
  start: 'Start',
  questions: 'Questions',
  scan: 'Scan',
  result: 'Pilgrim result',
  doctor: 'Doctor view',
  volunteer: 'Volunteer',
};
const SCENARIO_LABELS: Readonly<Record<ScenarioName, string>> = { low: 'Low', moderate: 'Moderate', high: 'High' };
const LANGUAGE_LABELS: Readonly<Record<Language, string>> = { ar: 'العربية', en: 'English' };
const MODE_LABELS: Readonly<Record<SensorMode, string>> = { preset: 'Preset', fakeDevice: 'Fake ESP32', esp32: 'ESP32 (USB)' };
const STATUS_LABELS: Readonly<Record<DeviceStatus, string>> = {
  disconnected: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  unsupported: 'Needs Chrome or Edge on a computer (Web Serial)',
  error: 'Connection lost. Check the cable and connect again',
};
const SHORT_ZONE: Readonly<Record<string, string>> = {
  hallux: 'big toe',
  medialForefoot: 'inner forefoot',
  lateralForefoot: 'outer forefoot',
  heel: 'heel',
};

interface SegmentOption {
  readonly value: string;
  readonly label: string;
}

function segmented(label: string, action: string, attribute: string, options: readonly SegmentOption[], current: string): string {
  const buttons = options
    .map(
      (o) =>
        `<button type="button" data-action="${action}" data-${attribute}="${o.value}" aria-pressed="${o.value === current}">${o.label}</button>`,
    )
    .join('');
  return `<div class="control-group"><span>${label}</span><div class="segmented" role="group" aria-label="${label}">${buttons}</div></div>`;
}

const sensorName = (index: number): string => {
  const entry = SENSOR_ORDER[index];
  return entry ? `${entry[0] === 'L' ? 'L' : 'R'} ${SHORT_ZONE[entry[1]] ?? entry[1]}` : `#${index + 1}`;
};

function calibrationStatus(state: AppState): string {
  if (state.calibrating === 'zero') return 'Recording zero… keep the platform empty';
  if (state.calibrating === 'reference') return 'Press each of the 8 sensors with the reference weight (12 s)';
  const { zeroedAt, referencedAt } = state.calibration;
  const weak = state.weakSensors.length ? ` · No response: ${state.weakSensors.map(sensorName).join(', ')}` : '';
  if (zeroedAt && referencedAt) return `Calibrated${weak}`;
  if (zeroedAt) return `Zeroed; reference not set yet${weak}`;
  return 'Not calibrated: readings use the raw sensor range';
}

/** Source picker, connection and calibration. Calibration applies only to the real board. */
function deviceControls(state: AppState): string {
  if (state.sensorMode === 'preset') return '';
  const connected = state.deviceStatus === 'connected';
  const busy = state.deviceStatus === 'connecting' || state.calibrating !== null;
  const connectButton = connected
    ? `<button type="button" class="review-button" data-action="device-disconnect"${busy ? ' disabled' : ''}>Disconnect</button>`
    : `<button type="button" class="review-button" data-action="device-connect"${busy || state.deviceStatus === 'unsupported' ? ' disabled' : ''}>Connect</button>`;
  const calibration =
    state.sensorMode === 'esp32' && connected
      ? `<button type="button" class="review-button" data-action="calibrate" data-step="zero"${busy ? ' disabled' : ''}>1 · Zero</button>
         <button type="button" class="review-button" data-action="calibrate" data-step="reference"${busy ? ' disabled' : ''}>2 · Reference</button>
         <span class="review-status">${calibrationStatus(state)}</span>`
      : '';
  return `<div class="control-group device-controls"><span>Platform</span><div class="device-row">
      ${connectButton}<span class="review-status status-${state.deviceStatus}" role="status">${STATUS_LABELS[state.deviceStatus]}</span>${calibration}
    </div></div>`;
}

/** Controls for reviewers, outside the kiosk screen: jump to a screen, load a scenario, pick the sensor source, switch language. */
export class ReviewBarView {
  constructor(private readonly root: HTMLElement) {}

  render(state: AppState): void {
    const screens = SCREENS.map((s) => ({ value: s, label: SCREEN_LABELS[s] }));
    const scenarios = SCENARIO_NAMES.map((s) => ({ value: s, label: `<span class="dot dot-${s}"></span>${SCENARIO_LABELS[s]}` }));
    const languages = (['ar', 'en'] as const).map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }));
    const modes = SENSOR_MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }));
    const subtitle =
      state.sensorMode === 'esp32'
        ? 'Pressure from the ESP32 platform. Thermal and camera are not connected.'
        : 'Screening station prototype for team review. All readings are simulated.';

    this.root.innerHTML = `<div class="review-title"><img class="review-logo" src="${logoUrl}" alt="FootGuard Hajj logo" width="34" height="36"><div><strong>FootGuard Hajj · خطاك</strong><span>${subtitle}</span></div></div>
      ${segmented('Screen', 'navigate', 'screen', screens, state.screen)}
      ${segmented('Scenario', 'set-scenario', 'scenario', scenarios, state.scenario)}
      ${segmented('Sensor', 'set-sensor-mode', 'mode', modes, state.sensorMode)}
      ${deviceControls(state)}
      ${segmented('Language', 'set-language', 'language', languages, state.language)}
      <div class="control-group"><span>Hardware</span><a class="review-link" href="./device.html">3D station view</a></div>`;
  }
}
