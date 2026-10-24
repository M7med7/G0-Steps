import logoUrl from '../../assets/logo.webp';
import { UI } from '../../i18n/copy';
import type { LocaleStrings } from '../../i18n/locales';
import type { Bilingual } from '../../i18n/translate';
import { isPilgrimScreen, showsSimulatedData } from '../../models/ScreeningStore';
import { LOCALES, type Locale, type ScreenName } from '../../models/types';
import { station3dHref } from '../links';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';
import { renderLanguageMenu } from './languageMenu';

type Step = keyof LocaleStrings['steps'];

const STEPS: readonly Step[] = ['identify', 'exam', 'questions', 'scan', 'result'];
const STEP_OF: Readonly<Record<ScreenName, number>> = {
  identify: 0,
  exam: 1,
  handover: 2,
  questions: 2,
  scan: 3,
  result: 4,
  doctor: 4,
  volunteer: 4,
};

/** On the result, tabs switch between what the pilgrim sees and the clinical report. */
function viewTabs(ctx: ViewContext): string {
  const tabs = (
    [
      ['result', ctx.l.pilgrimView],
      ['doctor', ctx.l.reportView],
    ] as const
  )
    .map(([screen, label]) => {
      const selected = ctx.state.screen === screen;
      return `<button type="button" role="tab" aria-selected="${selected}" data-action="navigate" data-screen="${screen}">${label}</button>`;
    })
    .join('');
  return `<div class="view-tabs" role="tablist" aria-label="${ctx.l.resultViews}">${tabs}</div>`;
}

/**
 * The 3D station view is part of the site. The card screen invites to it from the feet stage, and the result screens
 * link to it here. It's hidden mid-screening so nobody leaves halfway.
 */
const SHOWS_STATION_LINK: Readonly<Record<ScreenName, boolean>> = {
  identify: false,
  exam: false,
  handover: false,
  questions: false,
  scan: false,
  result: true,
  doctor: true,
  volunteer: true,
};

function stationLink(ctx: ViewContext): string {
  if (!SHOWS_STATION_LINK[ctx.state.screen]) return '';
  // Icon only, so the bar still fits the result tabs and the language button in every language; the name stays as a tooltip and for screen readers.
  return `<a class="top-link top-link-icon" href="${station3dHref(ctx.language)}" title="${ctx.l.station3d}">${ICONS.cube}<span class="visually-hidden">${ctx.l.station3d}</span></a>`;
}

/** Simulated data is always labelled, in Arabic and English. "Live" appears only while the real board is connected. */
function sourceBadge(ctx: ViewContext): string {
  const badge = (text: Bilingual, extra = ''): string =>
    `<span class="sim-badge${extra}">${ICONS.dot}<span lang="ar">${text.ar}</span> · <span lang="en">${text.en}</span></span>`;
  if (showsSimulatedData(ctx.state)) return badge(UI.simulated);
  return ctx.state.deviceStatus === 'connected' ? badge(UI.liveSensors, ' live-badge') : badge(UI.platformOffline, ' offline-badge');
}

function progressRail(ctx: ViewContext): string {
  if (ctx.state.screen === 'volunteer') return '<ol class="rail"></ol>';
  const current = STEP_OF[ctx.state.screen];
  const items = STEPS.map((step, i) => {
    const status = i < current ? 'done' : i === current ? 'now' : '';
    const marker = i < current ? '✓' : String(i + 1);
    // Only the current step shows its name, so the bar fits in every language; the others keep it for screen readers.
    const label = i === current ? ctx.l.steps[step] : `<span class="visually-hidden">${ctx.l.steps[step]}</span>`;
    return `<li class="${status}"${i === current ? ' aria-current="step"' : ''}><i>${marker}</i>${label}</li>`;
  }).join('');
  return `<ol class="rail">${items}</ol>`;
}

/** Staff screens have Arabic and English copy only. */
const STAFF_LANGUAGES: readonly Locale[] = ['ar', 'en'];

/**
 * The language button, on every screen. Pilgrim screens offer all pilgrim languages; staff screens offer the two
 * staff languages and say where the rest are.
 */
function languagePicker(ctx: ViewContext): string {
  const { state } = ctx;
  const isOpen = state.languageMenuOpen;
  if (isPilgrimScreen(state.screen)) {
    return renderLanguageMenu({ choices: LOCALES, current: state.locale, action: 'set-locale', field: 'locale', isOpen, label: ctx.l.chooseLanguage });
  }
  return renderLanguageMenu({
    choices: STAFF_LANGUAGES,
    current: state.language,
    action: 'set-language',
    field: 'language',
    isOpen,
    label: ctx.l.chooseLanguage,
    note: ctx.t(UI.staffLanguageNote, { count: LOCALES.length }),
  });
}

export function renderTopBar(ctx: ViewContext): string {
  return `<div class="brand"><img class="logo" src="${logoUrl}" alt="" width="45" height="48"><div><b>FootGuard · خطاك</b><small>${ctx.l.brandSub}</small></div></div>
    ${ctx.state.screen === 'result' || ctx.state.screen === 'doctor' ? viewTabs(ctx) : progressRail(ctx)}
    ${stationLink(ctx)}
    ${languagePicker(ctx)}
    ${sourceBadge(ctx)}`;
}
