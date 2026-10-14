import type { Locale, PilgrimProfile } from './types';

/*
 * The station reads the pilgrim's card with a barcode scanner that types like a keyboard (USB or Bluetooth HID),
 * then Enter. The real card format isn't known yet (ADR-0004), so the prototype only recognises the invented sample
 * cards below. No real people.
 */

/** Longest code the scanner field accepts; anything longer is rejected before lookup. */
export const MAX_CARD_CODE_LENGTH = 64;

export const SAMPLE_CARDS: readonly PilgrimProfile[] = [
  { cardId: 'FG-SAMPLE-001', name: 'Siti Rahmawati', age: 63, sex: 'female', nationality: 'ID' },
  { cardId: 'FG-SAMPLE-002', name: 'Muhammad Bilal', age: 58, sex: 'male', nationality: 'PK' },
  { cardId: 'FG-SAMPLE-003', name: 'Abdul Karim', age: 71, sex: 'male', nationality: 'BD' },
  { cardId: 'FG-SAMPLE-004', name: 'Fatma Yıldız', age: 66, sex: 'female', nationality: 'TR' },
  { cardId: 'FG-SAMPLE-005', name: 'Aminu Bello', age: 54, sex: 'male', nationality: 'NG' },
  { cardId: 'FG-SAMPLE-006', name: 'Khadija Ahmed', age: 60, sex: 'female', nationality: 'EG' },
  { cardId: 'FG-SAMPLE-007', name: 'Abdulrahman Saleh', age: 67, sex: 'male', nationality: 'SA' },
];

/** The language a nationality most likely reads, so the pilgrim's screen opens in it. They can change it. */
export const NATIONALITY_LOCALE: Readonly<Record<string, Locale>> = {
  SA: 'ar',
  EG: 'ar',
  DZ: 'ar',
  SD: 'ar',
  IQ: 'ar',
  MA: 'ar',
  ID: 'id',
  PK: 'ur',
  IN: 'hi',
  BD: 'bn',
  NG: 'ha',
  TR: 'tr',
  MY: 'ms',
  SN: 'fr',
  ML: 'fr',
  RU: 'ru',
  UZ: 'ru',
  GB: 'en',
};

export const suggestedLocale = (profile: PilgrimProfile): Locale => NATIONALITY_LOCALE[profile.nationality] ?? 'en';

export type CardLookup = { readonly ok: true; readonly profile: PilgrimProfile } | { readonly ok: false; readonly reason: 'empty' | 'unknown' };

/** Looks a scanned code up. Codes are trimmed and compared without case; nothing outside the sample list matches. */
export function lookUpCard(code: string): CardLookup {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, reason: 'empty' };
  if (normalized.length > MAX_CARD_CODE_LENGTH) return { ok: false, reason: 'unknown' };
  const profile = SAMPLE_CARDS.find((card) => card.cardId === normalized);
  return profile ? { ok: true, profile } : { ok: false, reason: 'unknown' };
}
