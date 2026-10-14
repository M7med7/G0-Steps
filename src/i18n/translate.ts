import type { Language } from '../models/types';
import { fill } from './fill';

export interface Bilingual {
  readonly ar: string;
  readonly en: string;
}

export const otherLanguage = (language: Language): Language => (language === 'ar' ? 'en' : 'ar');

export const directionOf = (language: Language): 'rtl' | 'ltr' => (language === 'ar' ? 'rtl' : 'ltr');

/** Picks one language and fills {placeholders}. */
export function translate(text: Bilingual, language: Language, vars: Readonly<Record<string, string | number>> = {}): string {
  return fill(text[language], vars);
}
