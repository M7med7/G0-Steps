import logoUrl from '../../assets/logo.webp';
import { DEVICE_LAYER_COPY, DEVICE_PART_COPY, DEVICE_UI } from '../../i18n/copy';
import { translate, type Bilingual } from '../../i18n/translate';
import { DEVICE_LAYERS, LAYER_PARTS, layerNumber, type DeviceFocus, type DeviceSelection } from '../../models/deviceLayers';
import type { Language } from '../../models/types';
import { ICONS } from '../icons';

export interface DeviceViewState {
  readonly language: Language;
  readonly exploded: boolean;
  readonly focus: DeviceFocus;
}

type T = (text: Bilingual, vars?: Readonly<Record<string, string | number>>) => string;

export function renderDeviceTopBar(state: DeviceViewState): string {
  const t: T = (text, vars) => translate(text, state.language, vars);
  const toggle = state.exploded ? DEVICE_UI.assemble : DEVICE_UI.explode;
  return `<a class="d-brand" href="./"><img src="${logoUrl}" alt="" width="34" height="36"><span><b>FootGuard · خطاك</b><small>${t(DEVICE_UI.pageTitle)}</small></span></a>
    <div class="d-actions">
      <button type="button" class="d-btn" data-action="toggle-explode" aria-pressed="${state.exploded}">${t(toggle)}</button>
      <button type="button" class="d-btn" data-action="toggle-language" lang="${state.language === 'ar' ? 'en' : 'ar'}">${t(DEVICE_UI.language)}</button>
      <a class="d-btn d-btn-quiet" href="./">${t(DEVICE_UI.openApp)}</a>
    </div>`;
}

function overview(t: T): string {
  const items = DEVICE_LAYERS.map(
    (id) =>
      `<li><button type="button" class="d-layer-btn" data-action="select-layer" data-layer="${id}"><i>${layerNumber(id)}</i>${t(DEVICE_LAYER_COPY[id].name)}</button></li>`,
  ).join('');
  return `<h1>${t(DEVICE_UI.pageTitle)}</h1>
    <p class="d-lede">${t(DEVICE_UI.overviewLede)}</p>
    <ol class="d-layer-list" aria-label="${t(DEVICE_UI.layerList)}">${items}</ol>`;
}

function detail(t: T, focus: DeviceSelection): string {
  const layer = DEVICE_LAYER_COPY[focus.layer];
  const parts = LAYER_PARTS[focus.layer];
  const part = focus.part ? DEVICE_PART_COPY[focus.part] : null;
  const partButtons = parts
    .map(
      (id) =>
        `<button type="button" class="d-part-btn" data-action="select-part" data-part="${id}" aria-pressed="${focus.part === id}">${t(DEVICE_PART_COPY[id].name)}</button>`,
    )
    .join('');

  return `<button type="button" class="d-back" data-action="overview"><span class="d-back-icon">${ICONS.arrow}</span>${t(DEVICE_UI.backToAll)}</button>
    <p class="d-count">${t(DEVICE_UI.layerCount, { n: layerNumber(focus.layer), total: DEVICE_LAYERS.length })}</p>
    <h1 tabindex="-1">${t(layer.name)}</h1>
    <p class="d-lede">${t(layer.detail)}</p>
    ${
      parts.length
        ? `<h2>${t(DEVICE_UI.partsTitle)}</h2><div class="d-parts">${partButtons}</div>${
            part ? `<div class="d-part-detail"><h3>${t(part.name)}</h3><p>${t(part.detail)}</p></div>` : ''
          }`
        : ''
    }
    <div class="d-step">
      <button type="button" class="d-btn" data-action="step" data-step="-1">${t(DEVICE_UI.previous)}</button>
      <button type="button" class="d-btn" data-action="step" data-step="1">${t(DEVICE_UI.next)}</button>
    </div>`;
}

export function renderDevicePanel(state: DeviceViewState): string {
  const t: T = (text, vars) => translate(text, state.language, vars);
  return `<div class="d-panel-body">${state.focus ? detail(t, state.focus) : overview(t)}</div>
    <footer class="d-panel-foot"><p>${t(DEVICE_UI.keysHint)}</p><p>${t(DEVICE_UI.notToScale)}</p></footer>`;
}
