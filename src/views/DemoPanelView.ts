import logoUrl from '../assets/logo.webp';
import { SENSOR_ORDER } from '../models/pressureProtocol';
import type { AppState } from '../models/ScreeningStore';
import { SCENARIO_NAMES, SCREENS, SENSOR_MODES, type DeviceStatus, type Language, type ScenarioName, type ScreenName, type SensorMode } from '../models/types';
import { morphChildren } from './morph';

/*
 * The team's demo controls, kept out of the product view in a drawer: jump to a screen, load a scenario,
 * pick the sensor source, connect and calibrate the platform. English only, like other team tools.
 */

const SCREEN_LABELS: Readonly<Record<ScreenName, string>> = {
  start: 'Start',
  questions: 'Questions',
  scan: 'Scan',
  result: 'Pilgrim result',
  doctor: 'Doctor view',
  volunteer: 'Volunteer list',
};
const SCENARIO_LABELS: Readonly<Record<ScenarioName, string>> = { low: 'Low', moderate: 'Moderate', high: 'High' };
const LANGUAGE_LABELS: Readonly<Record<Language, string>> = { ar: 'العربية', en: 'English' };
const MODE_LABELS: Readonly<Record<SensorMode, string>> = { preset: 'Preset', fakeDevice: 'Fake ESP32', esp32: 'ESP32 (USB)' };
const MODE_HINTS: Readonly<Record<SensorMode, string>> = {
  preset: 'Fixed demo readings from the scenario above.',
  fakeDevice: 'A stand-in board that streams the real data format. Connect, then run a scan.',
  esp32: 'The real pressure platform over a USB cable (Chrome or Edge).',
};
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

const ICON_SLIDERS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

interface Option {
  readonly value: string;
  readonly label: string;
}

function choices(label: string, action: string, attribute: string, options: readonly Option[], current: string): string {
  const buttons = options
    .map(
      (o) =>
        `<button type="button" class="demo-choice" data-action="${action}" data-${attribute}="${o.value}" aria-pressed="${o.value === current}">${o.label}</button>`,
    )
    .join('');
  return `<section class="demo-section"><h3>${label}</h3><div class="demo-choices" role="group" aria-label="${label}">${buttons}</div></section>`;
}

const sensorName = (index: number): string => {
  const entry = SENSOR_ORDER[index];
  return entry ? `${entry[0]} ${SHORT_ZONE[entry[1]] ?? entry[1]}` : `#${index + 1}`;
};

function calibrationStatus(state: AppState): string {
  if (state.calibrating === 'zero') return 'Recording zero… keep the platform empty.';
  if (state.calibrating === 'reference') return 'Press each of the 8 sensors with the reference weight (12 s).';
  const { zeroedAt, referencedAt } = state.calibration;
  const weak = state.weakSensors.length ? ` No response: ${state.weakSensors.map(sensorName).join(', ')}.` : '';
  if (zeroedAt && referencedAt) return `Calibrated.${weak}`;
  if (zeroedAt) return `Zeroed; reference not set yet.${weak}`;
  return 'Not calibrated: readings use the raw sensor range.';
}

/** Connection and, for the real board, calibration. Hidden for presets, which have no device. */
function platform(state: AppState): string {
  if (state.sensorMode === 'preset') return '';
  const connected = state.deviceStatus === 'connected';
  const busy = state.deviceStatus === 'connecting' || state.calibrating !== null;
  const connect = connected
    ? `<button type="button" class="demo-button" data-action="device-disconnect"${busy ? ' disabled' : ''}>Disconnect</button>`
    : `<button type="button" class="demo-button demo-button-primary" data-action="device-connect"${busy || state.deviceStatus === 'unsupported' ? ' disabled' : ''}>Connect</button>`;
  const calibration =
    state.sensorMode === 'esp32' && connected
      ? `<div class="demo-row">
           <button type="button" class="demo-button" data-action="calibrate" data-step="zero"${busy ? ' disabled' : ''}>1 · Zero</button>
           <button type="button" class="demo-button" data-action="calibrate" data-step="reference"${busy ? ' disabled' : ''}>2 · Reference</button>
         </div>
         <p class="demo-hint">${calibrationStatus(state)}</p>`
      : '';
  return `<section class="demo-section"><h3>Platform</h3>
      <div class="demo-row">${connect}<span class="demo-status status-${state.deviceStatus}" role="status"><i></i>${STATUS_LABELS[state.deviceStatus]}</span></div>
      ${calibration}
    </section>`;
}

function drawer(state: AppState): string {
  const screens = SCREENS.map((s) => ({ value: s, label: SCREEN_LABELS[s] }));
  const scenarios = SCENARIO_NAMES.map((s) => ({ value: s, label: `<span class="dot dot-${s}"></span>${SCENARIO_LABELS[s]}` }));
  const languages = (['ar', 'en'] as const).map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }));
  const modes = SENSOR_MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }));
  return `<header class="demo-head">
      <img src="${logoUrl}" alt="" width="34" height="36">
      <div><strong>Demo controls</strong><span>For the team. Pilgrims never see this.</span></div>
      <button type="button" class="demo-close" data-action="close-demo" aria-label="Close demo controls">${ICON_CLOSE}</button>
    </header>
    <div class="demo-body">
      ${choices('Screen', 'navigate', 'screen', screens, state.screen)}
      ${choices('Scenario', 'set-scenario', 'scenario', scenarios, state.scenario)}
      ${choices('Sensor source', 'set-sensor-mode', 'mode', modes, state.sensorMode)}
      <p class="demo-hint">${MODE_HINTS[state.sensorMode]}</p>
      ${platform(state)}
      ${choices('Language', 'set-language', 'language', languages, state.language)}
      <section class="demo-section"><h3>Hardware</h3><a class="demo-link" href="./device.html">Open the 3D station view</a></section>
    </div>`;
}

export class DemoPanelView {
  private wasOpen = false;

  constructor(private readonly root: HTMLElement) {}

  render(state: AppState): void {
    const open = state.demoOpen;
    morphChildren(
      this.root,
      `<button type="button" class="demo-toggle" data-action="toggle-demo" aria-expanded="${open}" aria-controls="demo-drawer" title="Demo controls">${ICON_SLIDERS}<span>Demo controls</span></button>
       <button type="button" class="demo-scrim" data-action="close-demo" tabindex="-1" aria-label="Close demo controls"></button>
       <aside class="demo-drawer" id="demo-drawer" aria-label="Demo controls">${drawer(state)}</aside>`,
    );
    this.root.dataset['open'] = String(open);
    // Closed, the drawer can't take focus; opened, focus moves into it.
    this.root.querySelector('.demo-drawer')?.toggleAttribute('inert', !open);
    if (open && !this.wasOpen) this.root.querySelector<HTMLElement>('.demo-close')?.focus();
    if (!open && this.wasOpen) this.root.querySelector<HTMLElement>('.demo-toggle')?.focus();
    this.wasOpen = open;
  }
}
