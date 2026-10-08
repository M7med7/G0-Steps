import { DEVICE_LAYER_COPY, DEVICE_PART_COPY, DEVICE_UI } from '../i18n/copy';
import { directionOf, otherLanguage, translate } from '../i18n/translate';
import {
  DEVICE_LAYERS,
  LAYER_PARTS,
  focusLayer,
  focusPart,
  isDeviceLayerId,
  isDevicePartId,
  stepLayer,
  type DeviceLayerId,
  type DevicePartId,
} from '../models/deviceLayers';
import type { DeviceScene } from '../scene/DeviceScene';
import { renderDevicePanel, renderDeviceTopBar, type DeviceViewState } from '../views/device/devicePanel';

/** A pointer that moves further than this between press and release is a drag, not a tap. */
const TAP_SLOP_PX = 6;

export interface DeviceElements {
  readonly root: HTMLElement;
  readonly top: HTMLElement;
  readonly panel: HTMLElement;
  readonly stage: HTMLElement;
  readonly hint: HTMLElement;
}

/** Handles input on the device page and keeps the scene, panel and labels in step with the state. */
export class DeviceController {
  private state: DeviceViewState;
  private pressedAt: { x: number; y: number } | null = null;
  private hoverFrame = 0;

  constructor(
    private readonly scene: DeviceScene,
    private readonly el: DeviceElements,
    initial: DeviceViewState,
  ) {
    this.state = initial;
  }

  start(doc: Document): void {
    doc.addEventListener('click', (event) => this.onClick(event));
    doc.addEventListener('keydown', (event) => this.onKey(event));

    const canvas = this.el.stage;
    canvas.addEventListener('pointerdown', (event) => (this.pressedAt = { x: event.clientX, y: event.clientY }));
    canvas.addEventListener('pointerup', (event) => this.onTap(event));
    canvas.addEventListener('pointermove', (event) => this.onHover(event));
    canvas.addEventListener('pointerleave', () => this.scene.setHover(null));

    this.render();
    this.scene.setExploded(this.state.exploded);
  }

  private update(next: Partial<DeviceViewState>): void {
    const before = this.state;
    this.state = { ...before, ...next };
    if (this.state.focus !== before.focus) this.scene.setFocus(this.state.focus);
    if (this.state.exploded !== before.exploded) this.scene.setExploded(this.state.exploded);
    this.render();
  }

  private render(): void {
    const { language } = this.state;
    const root = this.el.root;
    root.lang = language;
    root.dir = directionOf(language);
    document.title = `FootGuard · ${translate(DEVICE_UI.pageTitle, language)}`;
    this.el.top.innerHTML = renderDeviceTopBar(this.state);
    this.el.panel.innerHTML = renderDevicePanel(this.state);
    this.el.hint.textContent = translate(DEVICE_UI.hint, language);
    this.scene.setLabels({
      layers: Object.fromEntries(DEVICE_LAYERS.map((id) => [id, translate(DEVICE_LAYER_COPY[id].name, language)])) as Record<DeviceLayerId, string>,
      parts: Object.fromEntries(
        DEVICE_LAYERS.flatMap((id) => LAYER_PARTS[id]).map((id) => [id, translate(DEVICE_PART_COPY[id].name, language)]),
      ) as Record<DevicePartId, string>,
    });
  }

  private selectLayer(layer: DeviceLayerId): void {
    this.update({ focus: focusLayer(layer), exploded: true });
    this.el.panel.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }

  private onClick(event: MouseEvent): void {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-action]');
    if (!target) return;
    const { action } = target.dataset;
    if (action === 'select-layer' && isDeviceLayerId(target.dataset.layer)) this.selectLayer(target.dataset.layer);
    else if (action === 'select-part' && isDevicePartId(target.dataset.part)) this.update({ focus: focusPart(target.dataset.part), exploded: true });
    else if (action === 'overview') this.update({ focus: null });
    else if (action === 'step') this.update({ focus: stepLayer(this.state.focus, target.dataset.step === '-1' ? -1 : 1), exploded: true });
    else if (action === 'toggle-explode') this.update({ exploded: !this.state.exploded, focus: null });
    else if (action === 'toggle-language') this.update({ language: otherLanguage(this.state.language) });
  }

  private onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape' && this.state.focus) {
      this.update({ focus: null });
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.update({ focus: stepLayer(this.state.focus, event.key === 'ArrowDown' ? 1 : -1), exploded: true });
    }
  }

  private onTap(event: PointerEvent): void {
    const start = this.pressedAt;
    this.pressedAt = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP_PX) return;
    if ((event.target as Element | null)?.closest('[data-action]')) return; // a label, handled by onClick
    const hit = this.scene.pick(event.clientX, event.clientY);
    if (!hit) return;
    const current = this.state.focus;
    // Tapping a part zooms in on it; tapping the focused layer again with no part keeps the focus.
    if (hit.part && current?.layer === hit.layer) this.update({ focus: focusPart(hit.part) });
    else if (current?.layer !== hit.layer) this.selectLayer(hit.layer);
  }

  private onHover(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    cancelAnimationFrame(this.hoverFrame);
    this.hoverFrame = requestAnimationFrame(() => {
      const hit = this.scene.pick(event.clientX, event.clientY);
      this.scene.setHover(hit?.layer ?? null);
    });
  }
}
