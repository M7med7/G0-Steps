import { UI } from '../../i18n/copy';
import { renderFootMap } from '../components/footMap';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

export function renderStart(ctx: ViewContext): string {
  return `<section class="guide">
      ${bilingualHeading(ctx, UI.startTitle)}
      <p class="lede">${ctx.t(UI.startLede)}</p>
      <div class="row">
        <button type="button" class="btn btn-primary" data-action="begin" data-language="ar">${ICONS.arrow}<span lang="ar">ابدأ بالعربية</span></button>
        <button type="button" class="btn btn-ghost" data-action="begin" data-language="en"><span lang="en">Start in English</span></button>
      </div>
      <p class="note push-end">${ctx.t(UI.startVolunteer)}</p>
    </section>
    <aside class="foot-pane">
      ${renderFootMap(ctx, { kind: 'idle' }, null)}
      <p class="note">${ctx.t(UI.startFootHint)}</p>
    </aside>`;
}
