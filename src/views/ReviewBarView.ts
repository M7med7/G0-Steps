import logoUrl from '../assets/logo.webp';
import type { AppState } from '../models/ScreeningStore';
import { SCENARIO_NAMES, SCREENS, type Language, type ScenarioName, type ScreenName } from '../models/types';

const SCREEN_LABELS: Readonly<Record<ScreenName, string>> = {
  start: 'Start',
  questions: 'Questions',
  scan: 'Scan',
  result: 'Result',
  volunteer: 'Volunteer',
};
const SCENARIO_LABELS: Readonly<Record<ScenarioName, string>> = { low: 'Low', moderate: 'Moderate', high: 'High' };
const LANGUAGE_LABELS: Readonly<Record<Language, string>> = { ar: 'العربية', en: 'English' };

interface SegmentOption {
  readonly value: string;
  readonly label: string;
}

function segmented(label: string, action: string, attribute: string, options: readonly SegmentOption[], current: string): string {
  const buttons = options
    .map(
      (o) =>
        `<button type="button" data-action="${action}" data-${attribute}="${o.value}" aria-pressed="${o.value === current}">${o.label}</button>`,
    )
    .join('');
  return `<div class="control-group"><span>${label}</span><div class="segmented" role="group" aria-label="${label}">${buttons}</div></div>`;
}

/** Controls for reviewers, outside the kiosk screen: jump to a screen, load a scenario, switch language. */
export class ReviewBarView {
  constructor(private readonly root: HTMLElement) {}

  render(state: AppState): void {
    const screens = SCREENS.map((s) => ({ value: s, label: SCREEN_LABELS[s] }));
    const scenarios = SCENARIO_NAMES.map((s) => ({ value: s, label: `<span class="dot dot-${s}"></span>${SCENARIO_LABELS[s]}` }));
    const languages = (['ar', 'en'] as const).map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }));

    this.root.innerHTML = `<div class="review-title"><img class="review-logo" src="${logoUrl}" alt="FootGuard Hajj logo" width="34" height="36"><div><strong>FootGuard Hajj · خطاك</strong><span>Screening station prototype for team review. All readings are simulated.</span></div></div>
      ${segmented('Screen', 'navigate', 'screen', screens, state.screen)}
      ${segmented('Scenario', 'set-scenario', 'scenario', scenarios, state.scenario)}
      ${segmented('Language', 'set-language', 'language', languages, state.language)}`;
  }
}
