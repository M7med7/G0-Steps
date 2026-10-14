import type { ScreeningResult, ZoneFlag } from '../../models/types';
import { renderFootMap, renderLegend } from '../components/footMap';
import { localeHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { CATEGORY_ICONS, ICONS } from '../icons';

function flagItem(ctx: ViewContext, flag: ZoneFlag): string {
  const foot = ctx.l.sides[flag.foot];
  return `<li class="flag flag-${flag.reason}">${ICONS.dot}${ctx.l.zones[flag.zone]} · ${foot} <span class="note">(${ctx.l.flagReasons[flag.reason]})</span></li>`;
}

/** Urgent and high concern get an alert in the pilgrim's language with Arabic (or English) beneath for the volunteer. */
function alert(ctx: ViewContext, result: ScreeningResult): string {
  if (!result.refer) return '';
  const pick = result.stopTesting ? 'urgentAlert' : 'referral';
  return `<div class="referral${result.stopTesting ? ' is-urgent' : ''}" role="alert">${CATEGORY_ICONS[result.category]}<div><b>${ctx.l[pick]}</b><span>${ctx.lOther[pick]}</span></div></div>`;
}

function footPane(ctx: ViewContext, result: ScreeningResult): string {
  const readings = ctx.state.readings;
  if (result.stopTesting && !readings) {
    return `${renderFootMap(ctx, { kind: 'idle' }, null)}
      <p class="stage-hint">${ctx.l.notMeasured}</p>`;
  }
  const flags = result.zoneFlags.length
    ? result.zoneFlags.map((f) => flagItem(ctx, f)).join('')
    : `<li class="note">${ctx.l.noMarkedAreas}</li>`;
  return `${renderFootMap(ctx, { kind: 'final' }, readings?.pressure ?? null)}
    ${renderLegend(ctx)}
    <h2 class="pane-title">${ctx.l.markedAreas}</h2>
    <ul class="flags">${flags}</ul>`;
}

/** Step 5, for the pilgrim: the action category, what to do, and a QR code to keep. */
export function renderResult(ctx: ViewContext, result: ScreeningResult): string {
  const { l } = ctx;
  const recommendations = result.recommendations
    .map((key, i) => `<li style="--i:${i}">${ICONS.check}<span>${l.recommendations[key]}</span></li>`)
    .join('');

  return `<section class="risk-band risk-${result.category}" data-key="result-${result.category}">
      <div class="verdict">${CATEGORY_ICONS[result.category]}${localeHeading(ctx, (s) => s.categories[result.category].title)}</div>
      <p class="lede">${l.categories[result.category].summary}</p>
      ${alert(ctx, result)}
      <ul class="recommendations">${recommendations}</ul>
      <div class="band-footer">
        <div class="qr" role="img" aria-label="${l.qrLabel}"><canvas data-qr></canvas></div>
        <div><p>${l.qrNote}</p><p>${l.provisional}</p></div>
      </div>
    </section>
    <aside class="foot-pane">
      ${footPane(ctx, result)}
      <div class="row push-end">
        <button type="button" class="btn btn-primary btn-small" data-action="new-screening">${l.nextPilgrim}</button>
        <button type="button" class="btn btn-ghost btn-small" data-action="navigate" data-screen="volunteer">${l.volunteerList}</button>
      </div>
    </aside>`;
}

/** Short, non-identifying summary encoded in the result QR code. Never the card or the pilgrim's details. */
export function qrPayload(result: ScreeningResult): string {
  const zones = result.zoneFlags.map((f) => `${f.foot}-${f.zone}`).join(',') || 'none';
  return `FOOTGUARD v1 | ${result.category} | refer=${result.refer ? 'yes' : 'no'} | zones=${zones} | simulated`;
}

