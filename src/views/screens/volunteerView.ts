import { PILGRIM_LANGUAGES, RISK_LEVELS, UI, ZONE_NAMES } from '../../i18n/copy';
import { summarize, type ScreeningRecord } from '../../models/screeningLog';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { escapeHtml } from '../html';
import { RISK_ICONS } from '../icons';

function row(ctx: ViewContext, record: ScreeningRecord): string {
  const separator = ctx.language === 'ar' ? '، ' : ', ';
  const areas = record.zones.length
    ? record.zones.map(({ foot, zone }) => `${ctx.t(ZONE_NAMES[zone])} (${ctx.t(foot === 'L' ? UI.leftShort : UI.rightShort)})`).join(separator)
    : '—';
  const currentChip = record.isCurrent ? ` <span class="chip chip-yes">${ctx.t(UI.thisScreening)}</span>` : '';
  return `<tr class="${record.isCurrent ? 'current' : ''}">
      <td class="num">${escapeHtml(record.time)}</td>
      <td class="num">${escapeHtml(record.id)}${currentChip}</td>
      <td>${ctx.t(PILGRIM_LANGUAGES[record.language])}</td>
      <td><span class="level-pill level-${record.level}">${RISK_ICONS[record.level]}${ctx.t(RISK_LEVELS[record.level].title)}</span></td>
      <td>${areas}</td>
      <td class="${record.referred ? 'referred' : ''}">${ctx.t(record.referred ? UI.yes : UI.no)}</td>
    </tr>`;
}

export function renderVolunteer(ctx: ViewContext, log: readonly ScreeningRecord[]): string {
  const summary = summarize(log);
  return `<section class="single">
      ${bilingualHeading(ctx, UI.todaysScreenings, 'h2')}
      <div class="stats">
        <div><b>${summary.screened}</b><span>${ctx.t(UI.screened)}</span></div>
        <div><b class="stat-high">${summary.highRisk}</b><span>${ctx.t(UI.highRisk)}</span></div>
        <div><b>${summary.referred}</b><span>${ctx.t(UI.referred)}</span></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th scope="col">${ctx.t(UI.colTime)}</th><th scope="col">${ctx.t(UI.colScreening)}</th><th scope="col">${ctx.t(UI.colLanguage)}</th>
          <th scope="col">${ctx.t(UI.colResult)}</th><th scope="col">${ctx.t(UI.colAreas)}</th><th scope="col">${ctx.t(UI.colReferral)}</th>
        </tr></thead>
        <tbody>${log.map((r) => row(ctx, r)).join('')}</tbody>
      </table></div>
    </section>`;
}
