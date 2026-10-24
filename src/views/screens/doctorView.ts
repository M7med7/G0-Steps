import { CATEGORY_COPY, EXAM_COPY, RULE_COPY, UI } from '../../i18n/copy';
import { LOCALE_META } from '../../i18n/locales';
import { EXAM_ITEMS, QUESTIONS } from '../../models/questions';
import { zoneState } from '../../models/riskAssessment';
import { RULES } from '../../models/rules';
import { ZONES, type Foot, type PressureMap, type Response, type ScreeningResult, type SensorReadings, type Zone } from '../../models/types';
import { renderFootMap, renderLegend } from '../components/footMap';
import { bilingualHeading } from '../components/heading';
import { profileStrip } from '../components/profileStrip';
import type { ViewContext } from '../context';
import { escapeHtml } from '../html';
import { CATEGORY_ICONS, ICONS } from '../icons';

const percent = (load: number): string => `${Math.round(load * 100)}%`;

/** "Yes · Right foot", "Not sure", or "Not recorded", in the staff language. */
function responseText(ctx: ViewContext, response: Response): string {
  if (response.answer === null) return ctx.t(UI.notRecorded);
  const side = response.answer === 'yes' && response.side ? ` · ${ctx.l.sides[response.side]}` : '';
  return `${ctx.l[response.answer]}${side}`;
}

const responseClass = (response: Response): string =>
  response.answer === 'yes' ? 'is-yes' : response.answer === 'unsure' ? 'is-unsure' : response.answer === null ? 'is-missing' : '';

/** The category, the referral, and what the volunteer must do now (step 6). */
function categoryCard(ctx: ViewContext, result: ScreeningResult): string {
  const copy = CATEGORY_COPY[result.category];
  const referral = result.refer
    ? `<span class="chip chip-refer">${CATEGORY_ICONS.high}${ctx.t(result.stopTesting ? UI.testingStopped : UI.actionRequired)}</span>`
    : '';
  return `<div class="doctor-level">
      <span class="level-pill level-${result.category}">${CATEGORY_ICONS[result.category]}${ctx.t(copy.title)}</span>
      ${referral}
    </div>
    <div class="action-card action-${result.category}">
      <b>${ctx.t(UI.actionRequired)}</b>
      <p>${ctx.t(copy.action)}</p>
      <small>${ctx.t(UI.criteria)}: ${ctx.t(copy.criteria)}</small>
    </div>`;
}

/** The rules that fired, strongest first, each with its source or the illustrative tag. */
function firedRules(ctx: ViewContext, result: ScreeningResult): string {
  const items = RULES.filter((rule) => result.firedRules.includes(rule.id)).map((rule) => {
    const name = RULE_COPY[rule.id];
    const source =
      rule.source === 'illustrative'
        ? `<span class="rule-tag">${ctx.t(UI.illustrativeRule)}</span>`
        : `<small class="rule-source" dir="ltr">${escapeHtml(rule.source)}</small>`;
    return `<li><span class="level-dot level-${rule.category}"></span><span>${name ? ctx.t(name) : escapeHtml(rule.id)}</span>${source}</li>`;
  });
  return `<ul class="rule-list">${items.join('')}</ul>`;
}

/** Positive, unsure and missing exam items. "No" findings are left out so the report stays short. */
function examFindings(ctx: ViewContext): string {
  const items = EXAM_ITEMS.filter(({ key }) => ctx.state.exam[key].answer !== 'no').map(({ key }) => {
    const response = ctx.state.exam[key];
    return `<li class="${responseClass(response)}"><span>${ctx.t(EXAM_COPY[key])}</span><b>${responseText(ctx, response)}</b></li>`;
  });
  return items.length ? `<ul class="answer-grid">${items.join('')}</ul>` : `<p class="note">${ctx.t(UI.nothingFound)}</p>`;
}

/** Every question, plus the follow-ups that were asked, with the language the pilgrim answered in. */
function answers(ctx: ViewContext): string {
  const { state } = ctx;
  const rows = QUESTIONS.flatMap((question) => {
    const main = { short: ctx.l.questions[question.key].short, response: state.answers[question.key] };
    const followUp = question.followUp && state.answers[question.followUp].answer !== null
      ? [{ short: ctx.l.followUps[question.followUp].short, response: state.answers[question.followUp] }]
      : [];
    return [main, ...followUp];
  }).map(({ short, response }) => `<li class="${responseClass(response)}"><span>${short}</span><b>${responseText(ctx, response)}</b></li>`);
  return `<p class="note">${ctx.t(UI.answeredIn, { language: LOCALE_META[state.locale].nativeName })}</p>
    <ul class="answer-grid">${rows.join('')}</ul>`;
}

function dataSources(ctx: ViewContext, readings: SensorReadings | null): string {
  const pressure =
    readings?.source === 'esp32' ? UI.sourceEsp32 : ctx.state.sensorMode === 'fakeDevice' ? UI.sourceFake : UI.sourcePreset;
  const time = readings ? new Date(readings.capturedAt).toLocaleTimeString(ctx.language, { hour: '2-digit', minute: '2-digit' }) : null;
  const status = time ? `${ctx.t(pressure)} · ${ctx.t(UI.capturedAt, { time: escapeHtml(time) })}` : ctx.t(UI.noReading);
  return `<ul class="source-list">
      <li class="${time ? 'ok' : ''}">${time ? ICONS.check : ICONS.cross}<span>${ctx.l.sensorPressure}</span><span>${status}</span></li>
      <li>${ICONS.cross}<span>${ctx.l.sensorThermal}</span><span>${ctx.l.notConnected}</span></li>
      <li>${ICONS.cross}<span>${ctx.l.sensorCamera}</span><span>${ctx.l.notConnected}</span></li>
    </ul>`;
}

function loadCell(pressure: PressureMap, foot: Foot, zone: Zone): string {
  const load = pressure[foot][zone];
  return `<td class="num load-${zoneState(load)}">${percent(load)}</td>`;
}

/** Every zone's relative load on both feet, with the left/right gap the asymmetry check looks at. */
function zoneTable(ctx: ViewContext, result: ScreeningResult, pressure: PressureMap): string {
  const rows = ZONES.map((zone) => {
    const flagged = result.zoneFlags.some((flag) => flag.zone === zone);
    const gap = Math.abs(pressure.L[zone] - pressure.R[zone]);
    return `<tr class="${flagged ? 'flagged' : ''}">
        <th scope="row">${ctx.l.zones[zone]}</th>
        ${loadCell(pressure, 'L', zone)}${loadCell(pressure, 'R', zone)}
        <td class="num">${percent(gap)}</td>
      </tr>`;
  }).join('');
  return `<table class="zone-table">
      <thead><tr><th scope="col">${ctx.t(UI.colZone)}</th><th scope="col">${ctx.l.leftShort}</th><th scope="col">${ctx.l.rightShort}</th><th scope="col">${ctx.t(UI.colGap)}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** The clinical report: the same screening as the pilgrim's result, for staff, with the reasons behind it. */
export function renderDoctor(ctx: ViewContext, result: ScreeningResult): string {
  const readings = ctx.state.readings;
  const pressure = readings?.pressure ?? null;
  return `<section class="guide doctor">
      ${bilingualHeading(ctx, UI.doctorTitle, 'h2')}
      ${profileStrip(ctx)}
      <p class="note">${ctx.t(UI.doctorLede)} ${ctx.t(UI.provisional)}</p>
      ${categoryCard(ctx, result)}
      <h3 class="pane-title">${ctx.t(UI.whyThisCategory)}</h3>
      ${firedRules(ctx, result)}
    </section>
    <aside class="foot-pane doctor-pane">
      <h3 class="pane-title">${ctx.t(UI.examFindings)}</h3>
      ${examFindings(ctx)}
      <h3 class="pane-title">${ctx.t(UI.pilgrimAnswers)}</h3>
      ${answers(ctx)}
      <h3 class="pane-title">${ctx.t(UI.zoneLoads)}</h3>
      <div class="doctor-map">${renderFootMap(ctx, { kind: 'final' }, pressure)}${renderLegend(ctx)}</div>
      ${pressure ? zoneTable(ctx, result, pressure) : ''}
      <p class="note">${ctx.t(UI.loadNote)}</p>
      <h3 class="pane-title">${ctx.t(UI.dataSources)}</h3>
      ${dataSources(ctx, readings)}
      <div class="row push-end">
        <button type="button" class="btn btn-primary btn-small" data-action="new-screening">${ctx.l.nextPilgrim}</button>
      </div>
    </aside>`;
}
