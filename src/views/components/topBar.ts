import logoUrl from '../../assets/logo.webp';
import { UI } from '../../i18n/copy';
import type { ScreenName } from '../../models/types';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

const STEPS = [UI.stepStart, UI.stepQuestions, UI.stepScan, UI.stepResult] as const;
const STEP_OF: Readonly<Record<ScreenName, number>> = { start: 0, questions: 1, scan: 2, result: 3, volunteer: 3 };

function progressRail(ctx: ViewContext): string {
  if (ctx.state.screen === 'volunteer') return '<ol class="rail"></ol>';
  const current = STEP_OF[ctx.state.screen];
  const items = STEPS.map((step, i) => {
    const status = i < current ? 'done' : i === current ? 'now' : '';
    const marker = i < current ? '✓' : String(i + 1);
    return `<li class="${status}"${i === current ? ' aria-current="step"' : ''}><i>${marker}</i>${ctx.t(step)}</li>`;
  }).join('');
  return `<ol class="rail">${items}</ol>`;
}

export function renderTopBar(ctx: ViewContext): string {
  return `<div class="brand"><img class="logo" src="${logoUrl}" alt="" width="45" height="48"><div><b>FootGuard · خطاك</b><small>${ctx.t(UI.brandSub)}</small></div></div>
    ${progressRail(ctx)}
    <span class="sim-badge">${ICONS.dot}${ctx.t(UI.simulated)} · ${ctx.tOther(UI.simulated)}</span>`;
}
