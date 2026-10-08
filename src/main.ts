import './styles/tokens.css';
import './styles/base.css';
import './styles/review-bar.css';
import './styles/kiosk.css';
import './styles/screens.css';

import { AppController } from './controllers/AppController';
import { browserCalibrationStorage } from './controllers/calibrationStorage';
import { HashRouter } from './controllers/HashRouter';
import { SCENARIOS } from './models/scenarios';
import { createInitialState, ScreeningStore } from './models/ScreeningStore';
import { FakeDevice } from './sensors/FakeDevice';
import { SimulatedSource } from './sensors/SimulatedSource';
import { WebSerialDevice } from './sensors/WebSerialDevice';
import { KioskView } from './views/KioskView';
import { ReviewBarView } from './views/ReviewBarView';

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el;
}

const calibrationStorage = browserCalibrationStorage(() => window.localStorage);
const store = new ScreeningStore(createInitialState('moderate', calibrationStorage.load() ?? undefined));
const kioskView = new KioskView({
  stage: requireElement('stage'),
  kiosk: requireElement('kiosk'),
  top: requireElement('kiosk-top'),
  body: requireElement('kiosk-body'),
});
const reviewBarView = new ReviewBarView(requireElement('review-bar'));

const controller = new AppController({
  store,
  kioskView,
  reviewBarView,
  router: new HashRouter(window.location, window.history),
  createPresetSource: (scenario) => new SimulatedSource(scenario),
  // The fake pilgrim stands with the selected scenario's load, so switching scenario changes the stream.
  createDevice: (mode) =>
    mode === 'fakeDevice'
      ? new FakeDevice(() => SCENARIOS[store.getState().scenario].pressure)
      : navigator.serial
        ? new WebSerialDevice(navigator.serial)
        : null,
  calibrationStorage,
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});

controller.start(document, window);
