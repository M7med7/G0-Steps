import { otherLanguage, translate, type Bilingual } from '../i18n/translate';
import type { AppState } from '../models/ScreeningStore';
import type { Language } from '../models/types';

type Vars = Readonly<Record<string, string | number>>;

/** What every render function receives: the state plus translation helpers bound to the active language. */
export interface ViewContext {
  readonly state: AppState;
  readonly language: Language;
  /** Text in the active language. */
  readonly t: (text: Bilingual, vars?: Vars) => string;
  /** The same text in the other language (for the quieter second line). */
  readonly tOther: (text: Bilingual, vars?: Vars) => string;
}

export function createViewContext(state: AppState): ViewContext {
  const language = state.language;
  const second = otherLanguage(language);
  return {
    state,
    language,
    t: (text, vars) => translate(text, language, vars),
    tOther: (text, vars) => translate(text, second, vars),
  };
}
