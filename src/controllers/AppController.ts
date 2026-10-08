import { DEFAULT_CALIBRATION, toPressureMap, withReference, withZero, type Calibration, type RawFrame } from '../models/pressureProtocol';
import { isScanComplete, SENSOR_COUNT, usesDevice, type AppState, type ScreeningStore } from '../models/ScreeningStore';
import {
  isCalibrationStep,
  isLanguage,
  isScenarioName,
  isScreenName,
  isSensorMode,
  type CalibrationStep,
  type ScenarioName,
  type SensorMode,
} from '../models/types';
import { CAPTURE_MS, DeviceSource } from '../sensors/DeviceSource';
import type { PressureDevice } from '../sensors/PressureDevice';
import { SensorReadError, type SensorSource } from '../sensors/SensorSource';
import type { KioskView } from '../views/KioskView';
import type { DemoPanelView } from '../views/DemoPanelView';
import type { CalibrationStorage } from './calibrationStorage';
import type { HashRouter } from './HashRouter';

/** Time between sensors reporting in the preset scan animation. */
const SENSOR_STEP_MS = 650;
/** How often the live foot map refreshes. Every refresh re-renders the kiosk, so it stays modest. */
const LIVE_REFRESH_MS = 200;
/** Zero step: how long the empty platform is averaged. */
const ZERO_CAPTURE_MS = 2000;
/** Reference step: time the operator has to press each of the 8 sensors with the reference weight. */
const REFERENCE_CAPTURE_MS = 12000;

export interface AppControllerDeps {
  readonly store: ScreeningStore;
  readonly kioskView: KioskView;
  readonly demoPanelView: DemoPanelView;
  readonly router: HashRouter;
  readonly createPresetSource: (scenario: ScenarioName) => SensorSource;
  /** Returns null when this browser can't reach the device (no Web Serial). */
  readonly createDevice: (mode: Exclude<SensorMode, 'preset'>) => PressureDevice | null;
  readonly calibrationStorage: CalibrationStorage;
  readonly reduceMotion: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The browser throws NotFoundError when the person closes the port picker without choosing; that's not a failure. */
const isPickerClosed = (error: unknown): boolean => error instanceof DOMException && error.name === 'NotFoundError';

/**
 * Turns user input into model updates and keeps the views in sync.
 * Owns the scan lifecycle, the device connection and calibration.
 */
export class AppController {
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  /** Incremented on every new read so a slow, outdated read can't overwrite a newer one. */
  private readToken = 0;
  private readInFlight = false;
  private device: PressureDevice | null = null;
  private deviceListeners: (() => void)[] = [];
  private lastLiveAt = 0;
  private calibrationFrames: RawFrame[] = [];

  constructor(private readonly deps: AppControllerDeps) {}

  start(root: Document | HTMLElement, win: Window): void {
    const { store, router } = this.deps;
    store.subscribe((state) => this.onStateChange(state));
    root.addEventListener('click', (event) => this.onClick(event));
    root.addEventListener('keydown', (event) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape' && store.getState().demoOpen) store.setDemoOpen(false);
    });
    win.addEventListener('resize', () => this.deps.kioskView.fit());
    win.addEventListener('hashchange', () => {
      const screen = router.read();
      if (screen && screen !== store.getState().screen) this.openFromLink(screen);
    });

    const linked = router.read();
    if (linked && linked !== 'start') this.openFromLink(linked);
    else this.onStateChange(store.getState());
  }

  private openFromLink(screen: AppState['screen']): void {
    this.deps.store.markAllAnswered();
    this.deps.store.goTo(screen);
  }

  private onStateChange(state: AppState): void {
    this.deps.kioskView.render(state);
    this.deps.demoPanelView.render(state);
    this.deps.router.write(state.screen);
    this.syncScan(state);
  }

  /** Starts, finishes or stops sensor work to match the screen being shown. */
  private syncScan(state: AppState): void {
    if (state.screen !== 'scan') this.stopProgress();
    const onResult = state.screen === 'result' || state.screen === 'doctor';
    // Leaving the scan mid-animation stops it, so finish it here or the result would never appear.
    if (onResult && state.readings && !isScanComplete(state)) {
      this.deps.store.setScanProgress(SENSOR_COUNT);
      return;
    }
    if (state.readings || state.sensorError || this.readInFlight) return;
    if (state.screen === 'scan') void this.readSensors(state, true);
    if (onResult) void this.readSensors(state, false);
  }

  /** The calibration that matches the current source. The fake device always encodes with the default. */
  private calibrationFor(state: AppState): Calibration {
    return state.sensorMode === 'esp32' ? state.calibration : DEFAULT_CALIBRATION;
  }

  private sourceFor(state: AppState): SensorSource | null {
    if (state.sensorMode === 'preset') return this.deps.createPresetSource(state.scenario);
    if (!this.device || state.deviceStatus !== 'connected') return null;
    return new DeviceSource(this.device, this.calibrationFor(state));
  }

  private async readSensors(state: AppState, animate: boolean): Promise<void> {
    const { store } = this.deps;
    const source = this.sourceFor(state);
    if (!source) {
      store.setSensorError('noDevice');
      return;
    }
    const fromDevice = usesDevice(state);
    const token = ++this.readToken;
    this.readInFlight = true;
    if (fromDevice) this.fillProgressWhileRecording();
    try {
      const readings = await source.read();
      if (token !== this.readToken) return;
      this.stopProgress();
      store.setReadings(readings);
      if (animate && !fromDevice && !this.deps.reduceMotion) this.animateProgress();
      else store.setScanProgress(SENSOR_COUNT);
    } catch (error) {
      if (token !== this.readToken) return;
      this.stopProgress();
      if (!(error instanceof SensorReadError)) console.warn('Sensor read failed', error);
      store.setSensorError(error instanceof SensorReadError ? error.reason : 'readFailed');
    } finally {
      if (token === this.readToken) this.readInFlight = false;
    }
  }

  /** Preset scans reveal the sensors one by one, as a stand-in for reading them. */
  private animateProgress(): void {
    this.stopProgress();
    this.scanTimer = setInterval(() => {
      const next = this.deps.store.getState().scanProgress + 1;
      this.deps.store.setScanProgress(next);
      if (next >= SENSOR_COUNT) this.stopProgress();
    }, SENSOR_STEP_MS);
  }

  /** A device records for CAPTURE_MS; the bar fills over that time but only completes when the readings arrive. */
  private fillProgressWhileRecording(): void {
    this.stopProgress();
    this.scanTimer = setInterval(() => {
      const next = Math.min(this.deps.store.getState().scanProgress + 1, SENSOR_COUNT - 1);
      this.deps.store.setScanProgress(next);
    }, CAPTURE_MS / SENSOR_COUNT);
  }

  private stopProgress(): void {
    if (this.scanTimer !== null) clearInterval(this.scanTimer);
    this.scanTimer = null;
  }

  /** Cancels any read in flight; used when the scenario or source changes underneath it. */
  private cancelRead(): void {
    this.readToken += 1;
    this.readInFlight = false;
    this.stopProgress();
  }

  // ------------------------------------------------------------ device

  private async setSensorMode(mode: SensorMode): Promise<void> {
    const { store } = this.deps;
    if (mode === store.getState().sensorMode) return;
    this.cancelRead();
    await this.disconnectDevice();
    store.setSensorMode(mode);
    if (mode === 'esp32' && !this.deps.createDevice('esp32')) store.setDeviceStatus('unsupported');
  }

  private async connectDevice(): Promise<void> {
    const { store } = this.deps;
    const mode = store.getState().sensorMode;
    if (mode === 'preset' || this.device) return;
    const device = this.deps.createDevice(mode);
    if (!device) {
      store.setDeviceStatus('unsupported');
      return;
    }
    store.setDeviceStatus('connecting');
    try {
      await device.connect();
    } catch (error) {
      if (!isPickerClosed(error)) console.warn('Could not connect to the platform', error);
      store.setDeviceStatus(isPickerClosed(error) ? 'disconnected' : 'error');
      return;
    }
    // The source was switched while the port picker was open.
    if (store.getState().sensorMode !== mode) {
      await device.disconnect();
      return;
    }
    this.device = device;
    this.deviceListeners = [device.onFrame((frame) => this.onFrame(frame)), device.onLost((error) => void this.onLost(error))];
    store.setDeviceStatus('connected');
  }

  private async disconnectDevice(status: 'disconnected' | 'error' = 'disconnected'): Promise<void> {
    const device = this.device;
    this.device = null;
    this.deviceListeners.forEach((stop) => stop());
    this.deviceListeners = [];
    if (device) {
      try {
        await device.disconnect();
      } catch (error) {
        console.warn('The platform did not close cleanly', error);
      }
    }
    if (this.deps.store.getState().sensorMode !== 'preset') this.deps.store.setDeviceStatus(status);
  }

  private async onLost(error: unknown): Promise<void> {
    console.warn('Lost the connection to the platform', error);
    await this.disconnectDevice('error');
  }

  private onFrame(frame: RawFrame): void {
    const { store } = this.deps;
    const state = store.getState();
    if (state.calibrating) this.calibrationFrames.push(frame);
    const recording = state.screen === 'scan' && !state.readings;
    const now = performance.now();
    if ((recording || state.calibrating) && now - this.lastLiveAt >= LIVE_REFRESH_MS) {
      this.lastLiveAt = now;
      store.setLivePressure(toPressureMap(frame, this.calibrationFor(state)));
    }
  }

  // ------------------------------------------------------------ calibration

  private async calibrate(step: CalibrationStep): Promise<void> {
    const { store, calibrationStorage } = this.deps;
    const state = store.getState();
    if (state.sensorMode !== 'esp32' || state.deviceStatus !== 'connected' || state.calibrating) return;
    this.calibrationFrames = [];
    store.setCalibrating(step);
    await sleep(step === 'zero' ? ZERO_CAPTURE_MS : REFERENCE_CAPTURE_MS);

    const frames = this.calibrationFrames;
    this.calibrationFrames = [];
    const current = store.getState();
    // The device dropped during the step; setDeviceStatus has already ended it.
    if (current.calibrating !== step) return;
    if (frames.length === 0) {
      store.setCalibrating(null);
      store.setDeviceStatus('error');
      return;
    }
    const at = new Date().toISOString();
    if (step === 'zero') {
      const calibration = withZero(current.calibration, frames, at);
      store.setCalibration(calibration);
      calibrationStorage.save(calibration);
    } else {
      const { calibration, weak } = withReference(current.calibration, frames, at);
      store.setCalibration(calibration, weak);
      calibrationStorage.save(calibration);
    }
  }

  // ------------------------------------------------------------ input

  private onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;

    const { store } = this.deps;
    const { action, screen, scenario, language, value, mode, step } = button.dataset;

    switch (action) {
      case 'begin':
        if (isLanguage(language)) store.beginScreening(language);
        break;
      case 'answer':
        if (value === 'yes' || value === 'no') store.answerCurrent(value === 'yes');
        break;
      case 'previous-question':
        store.previousQuestion();
        break;
      case 'navigate':
        if (isScreenName(screen)) {
          if (screen === 'scan') this.cancelRead();
          store.goTo(screen);
        }
        break;
      case 'skip-scan':
        if (store.getState().readings) {
          this.stopProgress();
          store.setScanProgress(SENSOR_COUNT);
        }
        break;
      case 'set-scenario':
        if (isScenarioName(scenario)) {
          this.cancelRead();
          store.setScenario(scenario);
        }
        break;
      case 'set-language':
        if (isLanguage(language)) store.setLanguage(language);
        break;
      case 'set-sensor-mode':
        if (isSensorMode(mode)) void this.setSensorMode(mode);
        break;
      case 'device-connect':
        void this.connectDevice();
        break;
      case 'device-disconnect':
        this.cancelRead();
        void this.disconnectDevice();
        break;
      case 'calibrate':
        if (isCalibrationStep(step)) void this.calibrate(step);
        break;
      case 'toggle-demo':
        store.setDemoOpen(!store.getState().demoOpen);
        break;
      case 'close-demo':
        store.setDemoOpen(false);
        break;
    }
  }
}
