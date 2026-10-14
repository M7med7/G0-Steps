import { UI } from '../../i18n/copy';
import { LOCALE_META } from '../../i18n/locales';
import { LOCALES } from '../../models/types';
import { renderFootMap } from '../components/footMap';
import { localeHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

function languageGrid(ctx: ViewContext): string {
  const buttons = LOCALES.map((locale) => {
    const meta = LOCALE_META[locale];
    return `<button type="button" class="lang-choice" data-action="set-locale" data-locale="${locale}" lang="${locale}" dir="${meta.dir}" aria-pressed="${ctx.state.locale === locale}">${meta.nativeName}</button>`;
  }).join('');
  return `<div class="lang-grid" role="group" aria-label="${ctx.l.chooseLanguage}">${buttons}</div>`;
}

/** Step 3 begins: the volunteer hands the station over and the pilgrim picks their language. */
export function renderHandover(ctx: ViewContext): string {
  const draft = LOCALE_META[ctx.locale].reviewed ? '' : `<p class="note draft-note">${ctx.t(UI.draftTranslation)}</p>`;
  return `<section class="guide handover">
      ${localeHeading(ctx, (s) => s.handoverTitle)}
      <p class="lede">${ctx.l.handoverLede}</p>
      <div class="handover-feet">${renderFootMap(ctx, { kind: 'idle' }, null)}</div>
      <div class="row push-end">
        <button type="button" class="btn btn-primary btn-cta" data-action="start-questions">${ctx.l.startQuestions}${ICONS.arrow}</button>
      </div>
    </section>
    <aside class="foot-pane handover-pane">
      <h2 class="pane-title">${ctx.l.chooseLanguage}</h2>
      ${languageGrid(ctx)}
      ${draft}
    </aside>`;
}
