import { NATIONALITY_NAMES, UI } from '../../i18n/copy';
import { MAX_CARD_CODE_LENGTH, SAMPLE_CARDS } from '../../models/pilgrimCards';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { escapeHtml } from '../html';
import { ICONS } from '../icons';
import { station3dHref } from '../links';

function cardError(ctx: ViewContext): string {
  const error = ctx.state.cardError;
  if (!error) return '';
  return `<p class="error-message" role="alert">${ctx.t(error === 'empty' ? UI.cardEmpty : UI.cardUnknown)}</p>`;
}

function sampleCards(ctx: ViewContext): string {
  const cards = SAMPLE_CARDS.map((card) => {
    const country = NATIONALITY_NAMES[card.nationality];
    return `<button type="button" class="sample-card" data-action="sample-card" data-card="${escapeHtml(card.cardId)}">
        ${ICONS.card}<span><b dir="auto">${escapeHtml(card.name)}</b><small>${country ? ctx.t(country) : escapeHtml(card.nationality)}</small></span>
      </button>`;
  }).join('');
  return `<section class="sample-cards" aria-label="${ctx.t(UI.sampleCards)}">
      <h2 class="pane-title">${ctx.t(UI.sampleCards)}</h2>
      <div class="sample-grid">${cards}</div>
      <p class="note">${ctx.t(UI.sampleCardsNote)}</p>
    </section>`;
}

/**
 * Step 1, for the volunteer. A USB or Bluetooth barcode scanner types into the field and presses Enter;
 * the field is focused whenever this screen opens.
 */
export function renderIdentify(ctx: ViewContext): string {
  return `<section class="guide identify">
      ${bilingualHeading(ctx, UI.identifyTitle)}
      <p class="lede">${ctx.t(UI.identifyLede)}</p>
      <form class="card-form" data-action="card-scan" autocomplete="off">
        <label class="card-field">
          <span>${ctx.t(UI.cardField)}</span>
          <input name="card" type="text" maxlength="${MAX_CARD_CODE_LENGTH}" placeholder="${ctx.t(UI.cardPlaceholder)}" autofocus spellcheck="false" dir="ltr">
        </label>
        <button type="submit" class="btn btn-primary btn-small">${ctx.t(UI.lookUp)}</button>
      </form>
      ${cardError(ctx)}
      <p class="note">${ctx.t(UI.prepHint)}</p>
      <div class="row push-end">
        <button type="button" class="btn btn-ghost btn-small" data-action="no-card">${ctx.t(UI.noCard)}${ICONS.arrow}</button>
      </div>
    </section>
    <aside class="foot-pane stage-pane identify-pane">
      <a class="stage-link" href="${station3dHref(ctx.language)}">${ICONS.cube}<span>${ctx.t(UI.exploreStation)}</span>${ICONS.arrow}</a>
      ${sampleCards(ctx)}
    </aside>`;
}
