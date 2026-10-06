import type { Foot, Language, RiskLevel, RiskResult, Zone } from './types';

export type PilgrimLanguage = 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'bn' | 'ha' | 'fa' | 'ms';

export interface ScreeningRecord {
  readonly time: string;
  readonly id: string;
  readonly language: PilgrimLanguage;
  readonly level: RiskLevel;
  readonly zones: readonly { readonly foot: Foot; readonly zone: Zone }[];
  readonly referred: boolean;
  readonly isCurrent: boolean;
}

/** Invented sample screenings for the volunteer view. No real people. */
const SAMPLE_SCREENINGS: readonly ScreeningRecord[] = [
  { time: '06:12', id: 'FG-0131', language: 'ur', level: 'low', zones: [], referred: false, isCurrent: false },
  { time: '06:19', id: 'FG-0132', language: 'id', level: 'moderate', zones: [{ foot: 'R', zone: 'hallux' }], referred: false, isCurrent: false },
  { time: '06:27', id: 'FG-0133', language: 'ar', level: 'high', zones: [{ foot: 'L', zone: 'medialForefoot' }], referred: true, isCurrent: false },
  { time: '06:34', id: 'FG-0134', language: 'tr', level: 'low', zones: [], referred: false, isCurrent: false },
  { time: '06:41', id: 'FG-0135', language: 'bn', level: 'moderate', zones: [{ foot: 'L', zone: 'heel' }, { foot: 'R', zone: 'heel' }], referred: false, isCurrent: false },
  { time: '06:50', id: 'FG-0136', language: 'ha', level: 'low', zones: [], referred: false, isCurrent: false },
  { time: '06:58', id: 'FG-0137', language: 'fa', level: 'high', zones: [{ foot: 'R', zone: 'lateralForefoot' }], referred: true, isCurrent: false },
  { time: '07:05', id: 'FG-0138', language: 'ms', level: 'moderate', zones: [{ foot: 'R', zone: 'medialForefoot' }], referred: false, isCurrent: false },
];

/** Newest first; the current screening (if finished) is prepended. */
export function buildScreeningLog(current: RiskResult | null, language: Language): readonly ScreeningRecord[] {
  const history = [...SAMPLE_SCREENINGS].reverse();
  if (!current) return history;
  const currentRecord: ScreeningRecord = {
    time: '07:12',
    id: 'FG-0139',
    language,
    level: current.level,
    zones: current.zoneFlags.map(({ foot, zone }) => ({ foot, zone })),
    referred: current.refer,
    isCurrent: true,
  };
  return [currentRecord, ...history];
}

export interface ScreeningSummary {
  readonly screened: number;
  readonly highRisk: number;
  readonly referred: number;
}

export function summarize(log: readonly ScreeningRecord[]): ScreeningSummary {
  return {
    screened: log.length,
    highRisk: log.filter((r) => r.level === 'high').length,
    referred: log.filter((r) => r.referred).length,
  };
}
