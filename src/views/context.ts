import { fill, LOCALE_META, LOCALE_STRINGS, secondLocale, type LocaleStrings } from '../i18n/locales';
import { otherLanguage, translate, type Bilingual } from '../i18n/translate';
import { isPilgrimScreen, type AppState } from '../models/ScreeningStore';
import type { Language, Locale } from '../models/types';

type Vars = Readonly<Record<string, string | number>>;

/** What every render function receives: the state plus text helpers bound to the screen's language. */
export interface ViewContext {
  readonly state: AppState;
  /** The language this screen is drawn in: the pilgrim's on their screens, the staff language on the rest. */
  readonly locale: Locale;
  readonly dir: 'rtl' | 'ltr';
  /** The staff language, for Arabic/English-only copy. */
  readonly language: Language;
  /** Pilgrim-facing strings in the screen's language, and in the quieter second language. */
  readonly l: LocaleStrings;
  readonly lOther: LocaleStrings;
  readonly secondLocale: Locale;
  /** Staff copy in the staff language. */
  readonly t: (text: Bilingual, vars?: Vars) => string;
  /** Staff copy in the other staff language (for the quieter second line). */
  readonly tOther: (text: Bilingual, vars?: Vars) => string;
  /** Fills {placeholders} in a locale string. */
  readonly fill: (text: string, vars?: Vars) => string;
}

export function createViewContext(state: AppState): ViewContext {
  const language = state.language;
  const locale: Locale = isPilgrimScreen(state.screen) ? state.locale : language;
  const second = secondLocale(locale);
  return {
    state,
    locale,
    dir: LOCALE_META[locale].dir,
    language,
    l: LOCALE_STRINGS[locale],
    lOther: LOCALE_STRINGS[second],
    secondLocale: second,
    t: (text, vars) => translate(text, language, vars),
    tOther: (text, vars) => translate(text, otherLanguage(language), vars),
    fill,
  };
}
