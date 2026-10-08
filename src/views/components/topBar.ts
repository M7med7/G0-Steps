import logoUrl from '../../assets/logo.webp';
import { UI } from '../../i18n/copy';
import type { Bilingual } from '../../i18n/translate';
import { showsSimulatedData } from '../../models/ScreeningStore';
import type { ScreenName } from '../../models/types';
import { station3dHref } from '../links';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

const STEPS = [UI.stepStart, UI.stepQuestions, UI.stepScan, UI.stepResult] as const;
const STEP_OF: Readonly<Record<ScreenName, number>> = { start: 0, questions: 1, scan: 2, result: 3, doctor: 3, volunteer: 3 };
const VIEW_TABS = [
  ['result', UI.pilgrimView],
  ['doctor', UI.doctorView],
] as const;

/** On the result, tabs switch between what the pilgrim sees and what the doctor sees. */
function viewTabs(ctx: ViewContext): string {
  const tabs = VIEW_TABS.map(([screen, label]) => {
    const selected = ctx.state.screen === screen;
    return `<button type="button" role="tab" aria-selected="${selected}" data-action="navigate" data-screen="${screen}">${ctx.t(label)}</button>`;
  }).join('');
  return `<div class="view-tabs" role="tablist" aria-label="${ctx.t(UI.viewTabs)}">${tabs}</div>`;
}

/**
 * The 3D station view is part of the site. The start screen invites to it from the feet stage, and the result screens
 * link to it here. It's hidden mid-screening so nobody leaves halfway.
 */
const SHOWS_STATION_LINK: Readonly<Record<ScreenName, boolean>> = {
  start: false,
  questions: false,
  scan: false,
  result: true,
  doctor: true,
  volunteer: true,
};

function stationLink(ctx: ViewContext): string {
  if (!SHOWS_STATION_LINK[ctx.state.screen]) return '';
  return `<a class="top-link" href="${station3dHref(ctx.language)}">${ICONS.cube}<span>${ctx.t(UI.station3d)}</span></a>`;
}

/** Simulated data is always labelled. "Live" appears only while the real board is actually connected. */
function sourceBadge(ctx: ViewContext): string {
  const badge = (text: Bilingual, extra = ''): string =>
    `<span class="sim-badge${extra}">${ICONS.dot}${ctx.t(text)} · ${ctx.tOther(text)}</span>`;
  if (showsSimulatedData(ctx.state)) return badge(UI.simulated);
  return ctx.state.deviceStatus === 'connected' ? badge(UI.liveSensors, ' live-badge') : badge(UI.platformOffline, ' offline-badge');
}

function progressRail(ctx: ViewContext): string {
  if (ctx.state.screen === 'volunteer') return '<ol class="rail"></ol>';
  const current = STEP_OF[ctx.state.screen];
  const items = STEPS.map((step, i) => {
    const status = i < current ? 'done' : i === current ? 'now' : '';
    const marker = i < current ? '✓' : String(i + 1);
    return `<li class="${status}"${i === current ? ' aria-current="step"' : ''}><i>${marker}</i>${ctx.t(step)}</li>`;
  }).join('');
  return `<ol class="rail">${items}</ol>`;
}

export function renderTopBar(ctx: ViewContext): string {
  return `<div class="brand"><img class="logo" src="${logoUrl}" alt="" width="45" height="48"><div><b>FootGuard · خطاك</b><small>${ctx.t(UI.brandSub)}</small></div></div>
    ${ctx.state.screen === 'result' || ctx.state.screen === 'doctor' ? viewTabs(ctx) : progressRail(ctx)}
    ${stationLink(ctx)}
    ${sourceBadge(ctx)}`;
}
