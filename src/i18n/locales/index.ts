import type { Locale } from '../../models/types';
import { ar } from './ar';
import { bn } from './bn';
import { en } from './en';
import { fr } from './fr';
import { ha } from './ha';
import { hi } from './hi';
import { id } from './id';
import { ms } from './ms';
import { ru } from './ru';
import { tr } from './tr';
import { ur } from './ur';
import type { LocaleStrings } from './types';

export type { LocaleStrings } from './types';
export { fill } from '../fill';

export const LOCALE_STRINGS: Readonly<Record<Locale, LocaleStrings>> = { ar, en, ur, id, bn, hi, tr, fr, ms, ha, ru };

export interface LocaleMeta {
  /** The language's own name, shown on the language picker. */
  readonly nativeName: string;
  readonly dir: 'rtl' | 'ltr';
  /**
   * False until a native speaker has checked the translation. The handover screen and the clinical report say so.
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

/** The quieter second line under pilgrim headings: Arabic for the volunteer, or English when the pilgrim reads Arabic. */
export const secondLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');
