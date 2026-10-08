import { UI } from '../../i18n/copy';
import { renderFootMap } from '../components/footMap';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

const HOW_IT_WORKS = [UI.stepQuestions, UI.stepScan, UI.stepResult] as const;

export function renderStart(ctx: ViewContext): string {
  const steps = HOW_IT_WORKS.map((step, i) => `<li style="--i:${i}"><i>${i + 1}</i>${ctx.t(step)}</li>`).join('');
  return `<section class="guide start">
      ${bilingualHeading(ctx, UI.startTitle)}
      <p class="lede">${ctx.t(UI.startLede)}</p>
      <ol class="how-steps">${steps}</ol>
      <div class="row start-actions">
        <button type="button" class="btn btn-primary btn-cta" data-action="begin" data-language="ar"><span lang="ar">ابدأ بالعربية</span>${ICONS.arrow}</button>
        <button type="button" class="btn btn-ghost" data-action="begin" data-language="en"><span lang="en">Start in English</span></button>
      </div>
      <p class="note push-end">${ctx.t(UI.startVolunteer)}</p>
    </section>
    <aside class="foot-pane stage-pane">
      ${renderFootMap(ctx, { kind: 'idle' }, null)}
      <p class="stage-hint">${ctx.t(UI.startFootHint)}</p>
    </aside>`;
}
