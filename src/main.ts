import './styles/tokens.css';
import './styles/base.css';
import './styles/review-bar.css';
import './styles/kiosk.css';
import './styles/screens.css';

import { AppController } from './controllers/AppController';
import { HashRouter } from './controllers/HashRouter';
import { ScreeningStore } from './models/ScreeningStore';
import { SimulatedSource } from './sensors/SimulatedSource';
import { KioskView } from './views/KioskView';
import { ReviewBarView } from './views/ReviewBarView';

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el;
}

const store = new ScreeningStore();
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
  createSensorSource: (scenario) => new SimulatedSource(scenario),
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});

controller.start(document, window);
