import * as QRCode from 'qrcode';
import { directionOf } from '../i18n/translate';
import { selectResult, type AppState } from '../models/ScreeningStore';
import { buildScreeningLog } from '../models/screeningLog';
import type { RiskResult } from '../models/types';
import { renderTopBar } from './components/topBar';
import { createViewContext, type ViewContext } from './context';
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

export interface KioskElements {
  readonly stage: HTMLElement;
  readonly kiosk: HTMLElement;
  readonly top: HTMLElement;
  readonly body: HTMLElement;
}

/** Renders the kiosk screen from state. Knows nothing about events; buttons carry data-action attributes. */
export class KioskView {
  constructor(private readonly el: KioskElements) {}

  render(state: AppState): void {
    const ctx = createViewContext(state);
    const result = selectResult(state);

    this.el.kiosk.setAttribute('lang', state.language);
    this.el.kiosk.setAttribute('dir', directionOf(state.language));
    this.el.kiosk.dataset['screen'] = state.screen;
    this.el.top.innerHTML = renderTopBar(ctx);
    this.el.body.innerHTML = this.renderScreen(ctx, result);

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

  /** Scales the 1280×800 design to the available width, or switches to the reflowed layout. */
  fit(): void {
    const width = this.el.stage.clientWidth;
    const reflow = width < REFLOW_BELOW;
    this.el.stage.classList.toggle('reflow', reflow);
    if (reflow) {
      this.el.kiosk.style.transform = '';
      this.el.stage.style.height = '';
      return;
    }
    const scale = Math.min(1, width / DESIGN_WIDTH);
    this.el.kiosk.style.transform = `scale(${scale})`;
    this.el.stage.style.height = `${DESIGN_HEIGHT * scale}px`;
  }
}
