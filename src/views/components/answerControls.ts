import type { LocaleStrings } from '../../i18n/locales';
import { ANSWERS, SIDES, type Answer, type Response, type Side } from '../../models/types';
import { ICONS } from '../icons';

const ANSWER_ICONS: Readonly<Record<Answer, string>> = { yes: ICONS.check, no: ICONS.cross, unsure: ICONS.question };

/** Extra data-* attributes for the buttons, such as which exam item they answer. Values are fixed ids, never user input. */
type DataAttributes = Readonly<Record<string, string>>;

const attributes = (data: DataAttributes): string =>
  Object.entries(data)
    .map(([key, value]) => ` data-${key}="${value}"`)
    .join('');

/** Yes / No / Not sure. The chosen one is pressed; `size` picks the pilgrim's big buttons or the volunteer's compact row. */
export function answerButtons(
  strings: LocaleStrings,
  current: Answer | null,
  action: string,
  data: DataAttributes = {},
  size: 'large' | 'compact' = 'large',
): string {
  const buttons = ANSWERS.map(
    (answer) =>
      `<button type="button" class="btn btn-ghost btn-answer answer-${answer}" data-action="${action}" data-value="${answer}"${attributes(data)} aria-pressed="${current === answer}">${size === 'large' ? ANSWER_ICONS[answer] : ''}${strings[answer]}</button>`,
  ).join('');
  return `<div class="row answers answers-${size}" role="group">${buttons}</div>`;
}

/** Right / Left / Both, shown after a "yes" on anything that asks which foot. */
export function sidePicker(strings: LocaleStrings, response: Response, action: string, data: DataAttributes = {}): string {
  if (response.answer !== 'yes') return '';
  const buttons = SIDES.map(
    (side: Side) =>
      `<button type="button" class="side-choice" data-action="${action}" data-side="${side}"${attributes(data)} aria-pressed="${response.side === side}">${strings.sides[side]}</button>`,
  ).join('');
  return `<div class="side-picker" role="group" aria-label="${strings.whichFoot}">${buttons}</div>`;
}
