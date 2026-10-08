import { QUESTIONS, RISK_LEVELS, RULE_COPY, UI, ZONE_NAMES } from '../../i18n/copy';
import { zoneState } from '../../models/riskAssessment';
import { QUESTION_ORDER } from '../../models/questions';
import { RULES } from '../../models/rules';
import { ZONES, type Foot, type PressureMap, type RiskResult, type SensorReadings, type Zone } from '../../models/types';
import { renderFootMap, renderLegend } from '../components/footMap';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { escapeHtml } from '../html';
import { ICONS, RISK_ICONS } from '../icons';

const percent = (load: number): string => `${Math.round(load * 100)}%`;

function levelSummary(ctx: ViewContext, result: RiskResult): string {
  const referral = result.refer
    ? `<span class="chip chip-refer">${RISK_ICONS.high}${ctx.t(UI.referralShort)}</span>`
    : `<span class="chip">${ctx.t(UI.noReferral)}</span>`;
  return `<div class="doctor-level">
      <span class="level-pill level-${result.level}">${RISK_ICONS[result.level]}${ctx.t(RISK_LEVELS[result.level].title)}</span>
      ${referral}
    </div>`;
}

/** The rules that fired, strongest first, so the doctor can see why the station chose this level. */
function firedRules(ctx: ViewContext, result: RiskResult): string {
  const items = RULES.filter((rule) => result.firedRules.includes(rule.id)).map((rule) => {
    const name = RULE_COPY[rule.id];
    const tag = rule.source === 'illustrative' ? `<span class="rule-tag">${ctx.t(UI.illustrativeRule)}</span>` : '';
    return `<li><span class="level-dot level-${rule.level}"></span><span>${name ? ctx.t(name) : escapeHtml(rule.id)}</span>${tag}</li>`;
  });
  return `<ul class="rule-list">${items.join('')}</ul>`;
}

function answers(ctx: ViewContext): string {
  const items = QUESTION_ORDER.map((key) => {
    const yes = ctx.state.answers[key];
    return `<li class="${yes ? 'is-yes' : ''}"><span>${ctx.t(QUESTIONS[key].short)}</span><b>${ctx.t(yes ? UI.yes : UI.no)}</b></li>`;
  });
  return `<ul class="answer-grid">${items.join('')}</ul>`;
}

function dataSources(ctx: ViewContext, readings: SensorReadings | null): string {
  const pressure =
    readings?.source === 'esp32' ? UI.sourceEsp32 : ctx.state.sensorMode === 'fakeDevice' ? UI.sourceFake : UI.sourcePreset;
  const time = readings ? new Date(readings.capturedAt).toLocaleTimeString(ctx.language, { hour: '2-digit', minute: '2-digit' }) : '—';
  return `<ul class="source-list">
      <li class="ok">${ICONS.check}<span>${ctx.t(UI.sensorPressure)}</span><span>${ctx.t(pressure)} · ${ctx.t(UI.capturedAt, { time: escapeHtml(time) })}</span></li>
      <li>${ICONS.cross}<span>${ctx.t(UI.sensorThermal)}</span><span>${ctx.t(UI.notConnected)}</span></li>
      <li>${ICONS.cross}<span>${ctx.t(UI.sensorCamera)}</span><span>${ctx.t(UI.notConnected)}</span></li>
    </ul>`;
}

function loadCell(pressure: PressureMap, foot: Foot, zone: Zone): string {
  const load = pressure[foot][zone];
  return `<td class="num load-${zoneState(load)}">${percent(load)}</td>`;
}

/** Every zone's relative load on both feet, with the left/right gap the asymmetry rule looks at. */
function zoneTable(ctx: ViewContext, result: RiskResult, pressure: PressureMap): string {
  const rows = ZONES.map((zone) => {
    const flagged = result.zoneFlags.some((flag) => flag.zone === zone);
    const gap = Math.abs(pressure.L[zone] - pressure.R[zone]);
    return `<tr class="${flagged ? 'flagged' : ''}">
        <th scope="row">${ctx.t(ZONE_NAMES[zone])}</th>
        ${loadCell(pressure, 'L', zone)}${loadCell(pressure, 'R', zone)}
        <td class="num">${percent(gap)}</td>
      </tr>`;
  }).join('');
  return `<table class="zone-table">
      <thead><tr><th scope="col">${ctx.t(UI.colZone)}</th><th scope="col">${ctx.t(UI.leftShort)}</th><th scope="col">${ctx.t(UI.rightShort)}</th><th scope="col">${ctx.t(UI.colGap)}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function renderDoctor(ctx: ViewContext, result: RiskResult): string {
  const readings = ctx.state.readings;
  const pressure = readings?.pressure ?? null;
  return `<section class="guide doctor">
      ${bilingualHeading(ctx, UI.doctorTitle, 'h2')}
      <p class="note">${ctx.t(UI.doctorLede)} ${ctx.t(UI.illustrativeRules)}.</p>
      ${levelSummary(ctx, result)}
      <h3 class="pane-title">${ctx.t(UI.whyThisLevel)}</h3>
      ${firedRules(ctx, result)}
      <h3 class="pane-title">${ctx.t(UI.pilgrimAnswers)}</h3>
      ${answers(ctx)}
    </section>
    <aside class="foot-pane doctor-pane">
      <h3 class="pane-title">${ctx.t(UI.zoneLoads)}</h3>
      <div class="doctor-map">${renderFootMap(ctx, { kind: 'final' }, pressure)}${renderLegend(ctx)}</div>
      ${pressure ? zoneTable(ctx, result, pressure) : ''}
      <p class="note">${ctx.t(UI.loadNote)}</p>
      <h3 class="pane-title">${ctx.t(UI.dataSources)}</h3>
      ${dataSources(ctx, readings)}
      <div class="row push-end">
        <button type="button" class="btn btn-primary btn-small" data-action="navigate" data-screen="start">${ctx.t(UI.nextPilgrim)}</button>
      </div>
    </aside>`;
}
