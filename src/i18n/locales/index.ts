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

export { LOCALE_META, type LocaleMeta } from './meta';

/** The quieter second line under pilgrim headings: Arabic for the volunteer, or English when the pilgrim reads Arabic. */
export const secondLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');
