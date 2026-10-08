import './styles/tokens.css';
import './styles/base.css';
import './styles/device.css';

import { DEVICE_UI } from './i18n/copy';
import { translate } from './i18n/translate';
import { DeviceController } from './controllers/DeviceController';
import { DeviceScene } from './scene/DeviceScene';

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in device.html`);
  return el;
}

function webglAvailable(): boolean {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}

const stage = requireElement('device-stage');
const language = document.documentElement.lang === 'en' ? 'en' : 'ar';

if (!webglAvailable()) {
  stage.innerHTML = `<p class="d-error">${translate(DEVICE_UI.noWebgl, language)}</p>`;
} else {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new DeviceScene(requireElement('device-canvas'), reduceMotion);
  const controller = new DeviceController(
    scene,
    {
      root: document.documentElement,
      top: requireElement('device-top'),
      panel: requireElement('device-panel'),
      stage,
      hint: requireElement('device-hint'),
    },
    // Starts assembled, then opens up, so the first thing people see is the layers coming apart.
    { language, exploded: true, focus: null },
  );
  scene.setExploded(false, false);
  controller.start(document);
}
