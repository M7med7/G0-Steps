import { CATEGORY_COPY, UI } from '../../i18n/copy';
import { LOCALE_META } from '../../i18n/locales';
import { summarize, type ScreeningRecord } from '../../models/screeningLog';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { escapeHtml } from '../html';
import { CATEGORY_ICONS } from '../icons';

function row(ctx: ViewContext, record: ScreeningRecord): string {
  const separator = ctx.language === 'ar' ? '، ' : ', ';
  const areas = record.zones.length
    ? record.zones.map(({ foot, zone }) => `${ctx.l.zones[zone]} (${foot === 'L' ? ctx.l.leftShort : ctx.l.rightShort})`).join(separator)
    : '—';
  const currentChip = record.isCurrent ? ` <span class="chip chip-yes">${ctx.t(UI.thisScreening)}</span>` : '';
  const language = LOCALE_META[record.language];
  return `<tr class="${record.isCurrent ? 'current' : ''}">
      <td class="num">${escapeHtml(record.time)}</td>
      <td class="num">${escapeHtml(record.id)}${currentChip}</td>
      <td lang="${record.language}" dir="${language.dir}">${language.nativeName}</td>
      <td><span class="level-pill level-${record.category}">${CATEGORY_ICONS[record.category]}${ctx.t(CATEGORY_COPY[record.category].title)}</span></td>
      <td>${areas}</td>
      <td class="${record.referred ? 'referred' : ''}">${record.referred ? ctx.l.yes : ctx.l.no}</td>
    </tr>`;
}

export function renderVolunteer(ctx: ViewContext, log: readonly ScreeningRecord[]): string {
  const summary = summarize(log);
  return `<section class="single">
      ${bilingualHeading(ctx, UI.todaysScreenings, 'h2')}
      <div class="stats">
        <div><b>${summary.screened}</b><span>${ctx.t(UI.screened)}</span></div>
        <div><b class="stat-high">${summary.highConcern}</b><span>${ctx.t(UI.highConcern)}</span></div>
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
