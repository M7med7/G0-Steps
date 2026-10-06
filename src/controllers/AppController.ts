import { SENSOR_COUNT, type AppState, type ScreeningStore } from '../models/ScreeningStore';
import { isLanguage, isScenarioName, isScreenName, type ScenarioName } from '../models/types';
import type { SensorSource } from '../sensors/SensorSource';
import type { KioskView } from '../views/KioskView';
import type { ReviewBarView } from '../views/ReviewBarView';
import type { HashRouter } from './HashRouter';

/** Time between sensors reporting in the scan animation. */
const SENSOR_STEP_MS = 650;

export interface AppControllerDeps {
  readonly store: ScreeningStore;
  readonly kioskView: KioskView;
  readonly reviewBarView: ReviewBarView;
  readonly router: HashRouter;
  readonly createSensorSource: (scenario: ScenarioName) => SensorSource;
  readonly reduceMotion: boolean;
}

/**
 * Turns user input into model updates and keeps the views in sync.
 * Owns the scan lifecycle: reading sensors and pacing the progress animation.
 */
export class AppController {
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  /** Incremented on every new read so a slow, outdated read can't overwrite a newer one. */
  private readToken = 0;
  private readInFlight = false;

  constructor(private readonly deps: AppControllerDeps) {}

  start(root: Document | HTMLElement, win: Window): void {
    const { store, router } = this.deps;
    store.subscribe((state) => this.onStateChange(state));
    root.addEventListener('click', (event) => this.onClick(event));
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
    this.deps.reviewBarView.render(state);
    this.deps.router.write(state.screen);
    this.syncScan(state);
  }

  /** Starts, finishes or stops sensor work to match the screen being shown. */
  private syncScan(state: AppState): void {
    if (state.screen !== 'scan') this.stopProgress();
    if (state.readings || state.sensorError || this.readInFlight) return;
    if (state.screen === 'scan') void this.readSensors(state.scenario, true);
    if (state.screen === 'result') void this.readSensors(state.scenario, false);
  }

  private async readSensors(scenario: ScenarioName, animate: boolean): Promise<void> {
    const { store } = this.deps;
    const token = ++this.readToken;
    this.readInFlight = true;
    try {
      const readings = await this.deps.createSensorSource(scenario).read();
      if (token !== this.readToken) return;
      store.setReadings(readings);
      if (animate && !this.deps.reduceMotion) this.animateProgress();
      else store.setScanProgress(SENSOR_COUNT);
    } catch {
      if (token === this.readToken) store.setSensorError();
    } finally {
      if (token === this.readToken) this.readInFlight = false;
    }
  }

  private animateProgress(): void {
    this.stopProgress();
    this.scanTimer = setInterval(() => {
      const next = this.deps.store.getState().scanProgress + 1;
      this.deps.store.setScanProgress(next);
      if (next >= SENSOR_COUNT) this.stopProgress();
    }, SENSOR_STEP_MS);
  }

  private stopProgress(): void {
    if (this.scanTimer !== null) clearInterval(this.scanTimer);
    this.scanTimer = null;
  }

  /** Cancels any read in flight; used when the scenario changes underneath it. */
  private cancelRead(): void {
    this.readToken += 1;
    this.readInFlight = false;
    this.stopProgress();
  }

  private onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;

    const { store } = this.deps;
    const { action, screen, scenario, language, value } = button.dataset;

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
    }
  }
}
