import { FLAG_REASONS, RECOMMENDATIONS, RISK_LEVELS, UI, ZONE_NAMES } from '../../i18n/copy';
import type { RiskResult, ZoneFlag } from '../../models/types';
import { renderFootMap, renderLegend } from '../components/footMap';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS, RISK_ICONS } from '../icons';

function flagItem(ctx: ViewContext, flag: ZoneFlag): string {
  const foot = flag.foot === 'L' ? UI.leftFoot : UI.rightFoot;
  return `<li class="flag flag-${flag.reason}">${ICONS.dot}${ctx.t(ZONE_NAMES[flag.zone])} · ${ctx.t(foot)} <span class="note">(${ctx.t(FLAG_REASONS[flag.reason])})</span></li>`;
}

export function renderResult(ctx: ViewContext, result: RiskResult): string {
  const level = RISK_LEVELS[result.level];
  const flags = result.zoneFlags.length
    ? result.zoneFlags.map((f) => flagItem(ctx, f)).join('')
    : `<li class="note">${ctx.t(UI.noMarkedAreas)}</li>`;
  const referral = result.refer
    ? `<div class="referral" role="alert">${RISK_ICONS.high}<div><b>${ctx.t(UI.referral)}</b><span>${ctx.tOther(UI.referral)}</span></div></div>`
    : '';
  const recommendations = result.recommendations
    .map((key) => `<li>${ICONS.check}<span>${ctx.t(RECOMMENDATIONS[key])}</span></li>`)
    .join('');

  return `<section class="risk-band risk-${result.level}">
      <div class="verdict">${RISK_ICONS[result.level]}${bilingualHeading(ctx, level.title)}</div>
      <p class="lede">${ctx.t(level.summary)}</p>
      ${referral}
      <ul class="recommendations">${recommendations}</ul>
      <div class="band-footer">
        <div class="qr" role="img" aria-label="${ctx.t(UI.qrLabel)}"><canvas data-qr></canvas></div>
        <div><p>${ctx.t(UI.qrNote)}</p><p>${ctx.t(UI.illustrativeRules)}</p></div>
      </div>
    </section>
    <aside class="foot-pane">
      ${renderFootMap(ctx, { kind: 'final' }, ctx.state.readings?.pressure ?? null)}
      ${renderLegend(ctx)}
      <h2 class="pane-title">${ctx.t(UI.markedAreas)}</h2>
      <ul class="flags">${flags}</ul>
      <div class="row">
        <button type="button" class="btn btn-primary btn-small" data-action="navigate" data-screen="start">${ctx.t(UI.nextPilgrim)}</button>
        <button type="button" class="btn btn-ghost btn-small" data-action="navigate" data-screen="volunteer">${ctx.t(UI.volunteerList)}</button>
      </div>
    </aside>`;
}

/** Short, non-identifying summary encoded in the result QR code. */
export function qrPayload(result: RiskResult): string {
  const zones = result.zoneFlags.map((f) => `${f.foot}-${f.zone}`).join(',') || 'none';
  return `FOOTGUARD v0 | ${result.level} | refer=${result.refer ? 'yes' : 'no'} | zones=${zones} | simulated`;
}
