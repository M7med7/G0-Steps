import type { ActionCategory, Foot, Locale, ScreeningResult, Zone } from './types';

export interface ScreeningRecord {
  readonly time: string;
  readonly id: string;
  readonly language: Locale;
  readonly category: ActionCategory;
  readonly zones: readonly { readonly foot: Foot; readonly zone: Zone }[];
  readonly referred: boolean;
  readonly isCurrent: boolean;
}

/** Invented sample screenings for the volunteer view. No real people. */
const SAMPLE_SCREENINGS: readonly ScreeningRecord[] = [
  { time: '06:12', id: 'FG-0131', language: 'ur', category: 'low', zones: [], referred: false, isCurrent: false },
  { time: '06:19', id: 'FG-0132', language: 'id', category: 'moderate', zones: [{ foot: 'R', zone: 'hallux' }], referred: false, isCurrent: false },
  { time: '06:27', id: 'FG-0133', language: 'ar', category: 'high', zones: [{ foot: 'L', zone: 'medialForefoot' }], referred: true, isCurrent: false },
  { time: '06:34', id: 'FG-0134', language: 'tr', category: 'incomplete', zones: [], referred: false, isCurrent: false },
  { time: '06:41', id: 'FG-0135', language: 'bn', category: 'moderate', zones: [{ foot: 'L', zone: 'heel' }, { foot: 'R', zone: 'heel' }], referred: false, isCurrent: false },
  { time: '06:50', id: 'FG-0136', language: 'ha', category: 'low', zones: [], referred: false, isCurrent: false },
  { time: '06:58', id: 'FG-0137', language: 'hi', category: 'urgent', zones: [], referred: true, isCurrent: false },
  { time: '07:05', id: 'FG-0138', language: 'ms', category: 'moderate', zones: [{ foot: 'R', zone: 'medialForefoot' }], referred: false, isCurrent: false },
];

/** Newest first; the current screening (if finished) is prepended. */
export function buildScreeningLog(current: ScreeningResult | null, language: Locale): readonly ScreeningRecord[] {
  const history = [...SAMPLE_SCREENINGS].reverse();
  if (!current) return history;
  const currentRecord: ScreeningRecord = {
    time: '07:12',
    id: 'FG-0139',
    language,
    category: current.category,
    zones: current.zoneFlags.map(({ foot, zone }) => ({ foot, zone })),
    referred: current.refer,
    isCurrent: true,
  };
  return [currentRecord, ...history];
}

export interface ScreeningSummary {
  readonly screened: number;
  /** High concern or urgent. */
  readonly highConcern: number;
  readonly referred: number;
}

export function summarize(log: readonly ScreeningRecord[]): ScreeningSummary {
  return {
    screened: log.length,
    highConcern: log.filter((r) => r.category === 'high' || r.category === 'urgent').length,
    referred: log.filter((r) => r.referred).length,
  };
}
