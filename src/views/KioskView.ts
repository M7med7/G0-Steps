import * as QRCode from 'qrcode';
import { directionOf } from '../i18n/translate';
import { selectResult, type AppState } from '../models/ScreeningStore';
import { buildScreeningLog } from '../models/screeningLog';
import type { RiskResult, ScreenName } from '../models/types';
import { renderTopBar } from './components/topBar';
import { createViewContext, type ViewContext } from './context';
import { morphChildren } from './morph';
import { renderQuestions } from './screens/questionsView';
import { renderDoctor } from './screens/doctorView';
import { qrPayload, renderResult } from './screens/resultView';
import { renderScan } from './screens/scanView';
import { renderStart } from './screens/startView';
import { renderVolunteer } from './screens/volunteerView';

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 800;
/** Below this available width the kiosk reflows into one column instead of shrinking. */
const REFLOW_BELOW = 760;
/** The 1280×800 design scales up to fill bigger screens, but not past this (text stays crisp; it's vector). */
const MAX_SCALE = 2;

export interface KioskElements {
  readonly stage: HTMLElement;
  readonly kiosk: HTMLElement;
  readonly top: HTMLElement;
  readonly body: HTMLElement;
}

/** Renders the kiosk screen from state. Knows nothing about events; buttons carry data-action attributes. */
export class KioskView {
  private shownScreen: ScreenName | null = null;

  constructor(private readonly el: KioskElements) {}

  render(state: AppState): void {
    const ctx = createViewContext(state);
    const result = selectResult(state);

    this.el.kiosk.setAttribute('lang', state.language);
    this.el.kiosk.setAttribute('dir', directionOf(state.language));
    this.el.kiosk.dataset['screen'] = state.screen;
    morphChildren(this.el.top, renderTopBar(ctx));
    // A new screen is drawn fresh so its enter animation plays; updates within a screen only patch what changed,
    // which keeps the scan animations running instead of restarting on every progress tick.
    const body = this.renderScreen(ctx, result);
    if (state.screen !== this.shownScreen) this.el.body.innerHTML = body;
    else morphChildren(this.el.body, body);
    this.shownScreen = state.screen;

    if (state.screen === 'result' && result) void this.drawQr(result);
    this.fit();
  }

  private renderScreen(ctx: ViewContext, result: RiskResult | null): string {
    switch (ctx.state.screen) {
      case 'start':
        return renderStart(ctx);
      case 'questions':
        return renderQuestions(ctx);
      case 'scan':
        return renderScan(ctx);
      case 'result':
        // Until readings arrive the result screen shows the scan in progress.
        return result ? renderResult(ctx, result) : renderScan(ctx);
      case 'doctor':
        return result ? renderDoctor(ctx, result) : renderScan(ctx);
      case 'volunteer':
        return renderVolunteer(ctx, buildScreeningLog(result, ctx.language));
    }
  }

  private async drawQr(result: RiskResult): Promise<void> {
    const canvas = this.el.body.querySelector<HTMLCanvasElement>('canvas[data-qr]');
    if (!canvas) return;
    const ink = getComputedStyle(this.el.kiosk).getPropertyValue('--text').trim() || '#13262A';
    try {
      await QRCode.toCanvas(canvas, qrPayload(result), { width: 200, margin: 1, color: { dark: ink, light: '#FFFFFF' } });
    } catch {
      canvas.replaceWith(document.createTextNode('QR'));
    }
  }

  /** Scales the 1280×800 design to fill the window, centred, or switches to the reflowed layout on narrow screens. */
  fit(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const reflow = width < REFLOW_BELOW;
    this.el.stage.classList.toggle('reflow', reflow);
    document.documentElement.classList.toggle('kiosk-fullscreen', !reflow);
    if (reflow) {
      this.el.kiosk.style.transform = '';
      return;
    }
    const scale = Math.min(MAX_SCALE, width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const x = (width - DESIGN_WIDTH * scale) / 2;
    const y = (height - DESIGN_HEIGHT * scale) / 2;
    this.el.kiosk.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
}
