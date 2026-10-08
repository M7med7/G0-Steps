import './styles/tokens.css';
import './styles/base.css';
import './styles/device.css';

import { DEVICE_UI } from './i18n/copy';
import { translate } from './i18n/translate';
import { DeviceController } from './controllers/DeviceController';
import { DeviceScene } from './scene/DeviceScene';
import { buildDevice } from './scene/deviceModel';
import { loadStationModel } from './scene/stationModel';

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
  void start();
}

async function start(): Promise<void> {
  const loading = document.createElement('p');
  loading.className = 'd-loading';
  loading.setAttribute('role', 'status');
  loading.textContent = translate(DEVICE_UI.loading, language);
  stage.append(loading);
  // The Blender model, or the procedural one if the file can't be loaded or is missing a layer.
  const layers = await loadStationModel().catch((error: unknown) => {
    console.warn('Station model not loaded, using the built-in model instead.', error);
    return buildDevice();
  });
  loading.remove();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new DeviceScene(requireElement('device-canvas'), reduceMotion, layers);
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
