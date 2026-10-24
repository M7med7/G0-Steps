import { LOCALE_META } from '../../i18n/locales/meta';
import type { Locale } from '../../models/types';
import { ICONS } from '../icons';

export interface LanguageMenuOptions {
  /** The languages this screen can be shown in. */
  readonly choices: readonly Locale[];
  readonly current: Locale;
  /** The data-action each choice sends, with the language in `data-<field>`. */
  readonly action: string;
  readonly field: 'locale' | 'language';
  readonly isOpen: boolean;
  /** Names the button and the menu for screen readers, e.g. "Choose your language". */
  readonly label: string;
  /** Optional line under the list, e.g. why only two languages are offered here. */
  readonly note?: string;
}

/** The menu's id, so the controllers can move focus into it and back to its button. */
export const LANGUAGE_MENU_ID = 'language-menu';

/**
 * A button showing the current language that opens a list of every language available on this screen.
 * Each name is written in its own language and script, so a pilgrim can find theirs without reading the current one.
 */
export function renderLanguageMenu(options: LanguageMenuOptions): string {
  const { choices, current, action, field, isOpen, label, note } = options;
  const items = choices
    .map((locale) => {
      const meta = LOCALE_META[locale];
      const selected = locale === current;
      return `<button type="button" class="lang-option" data-action="${action}" data-${field}="${locale}" lang="${locale}" dir="${meta.dir}" aria-pressed="${selected}">${meta.nativeName}${selected ? ICONS.check : ''}</button>`;
    })
    .join('');
  const menu = isOpen
    ? `<div class="lang-menu" id="${LANGUAGE_MENU_ID}" role="group" aria-label="${label}">
        <p class="lang-menu-title">${label}</p>
        <div class="lang-options${choices.length > 4 ? ' is-grid' : ''}">${items}</div>
        ${note ? `<p class="lang-menu-note">${note}</p>` : ''}
      </div>`
    : '';
  return `<div class="lang-picker" data-lang-picker>
      <button type="button" class="lang-trigger" data-action="toggle-language-menu" aria-haspopup="true" aria-expanded="${isOpen}" aria-controls="${LANGUAGE_MENU_ID}" aria-label="${label}: ${LOCALE_META[current].nativeName}">
        ${ICONS.globe}<span lang="${current}">${LOCALE_META[current].nativeName}</span>
      </button>
      ${menu}
    </div>`;
}
