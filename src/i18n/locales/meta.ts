import type { Locale } from '../../models/types';

/* Language names and direction only, so pages that just show a language picker don't load every translation. */

export interface LocaleMeta {
  /** The language's own name, shown on the language picker. */
  readonly nativeName: string;
  readonly dir: 'rtl' | 'ltr';
  /**
   * False until a native speaker has checked the translation; the team tracks this, the screens don't show it.
   * Arabic and English are the team's own text.
   */
  readonly reviewed: boolean;
}

export const LOCALE_META: Readonly<Record<Locale, LocaleMeta>> = {
  ar: { nativeName: 'العربية', dir: 'rtl', reviewed: true },
  en: { nativeName: 'English', dir: 'ltr', reviewed: true },
  ur: { nativeName: 'اردو', dir: 'rtl', reviewed: false },
  id: { nativeName: 'Bahasa Indonesia', dir: 'ltr', reviewed: false },
  bn: { nativeName: 'বাংলা', dir: 'ltr', reviewed: false },
  hi: { nativeName: 'हिन्दी', dir: 'ltr', reviewed: false },
  tr: { nativeName: 'Türkçe', dir: 'ltr', reviewed: false },
  fr: { nativeName: 'Français', dir: 'ltr', reviewed: false },
  ms: { nativeName: 'Bahasa Melayu', dir: 'ltr', reviewed: false },
  ha: { nativeName: 'Hausa', dir: 'ltr', reviewed: false },
  ru: { nativeName: 'Русский', dir: 'ltr', reviewed: false },
};
