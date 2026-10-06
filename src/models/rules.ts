import type { RecommendationKey, RiskAnswers, RiskLevel, ZoneFlag } from './types';

/*
 * Every risk rule lives in this file. Each one names its source, or is tagged 'illustrative'.
 * Illustrative rules are for the prototype only and need sign-off from the medical members
 * before any demo outside the team.
 */

/** Relative load at or above this marks a zone as high pressure. */
export const HIGH_LOAD = 0.8;
/** Relative load at or above this marks a zone as raised (shown amber, not flagged). */
export const RAISED_LOAD = 0.65;
/** Left/right difference in the same zone that counts as asymmetric loading. */
export const ASYMMETRY_GAP = 0.3;
/** Number of history answers (past injury, pain, unusual shoes) that raises risk. */
export const HISTORY_COUNT_THRESHOLD = 2;

export interface ZoneFindings {
  readonly flags: readonly ZoneFlag[];
  readonly hasHighLoad: boolean;
  readonly hasAsymmetry: boolean;
}

export interface RiskRule {
  readonly id: string;
  readonly source: string;
  readonly level: RiskLevel;
  readonly refer: boolean;
  readonly recommendations: readonly RecommendationKey[];
  readonly when: (answers: RiskAnswers, findings: ZoneFindings) => boolean;
}

const historyCount = (a: RiskAnswers): number =>
  [a.previousFootInjury, a.currentPain, a.unusualFootwear].filter(Boolean).length;

export const RULES: readonly RiskRule[] = [
  {
    id: 'open-wound',
    source: 'illustrative',
    level: 'high',
    refer: true,
    recommendations: ['seeMedical'],
    when: (a) => a.currentWound,
  },
  {
    id: 'diabetes-with-numbness',
    source: 'illustrative',
    level: 'high',
    refer: true,
    recommendations: ['seeMedical', 'dailyCheck'],
    when: (a) => a.diabetes && a.numbness,
  },
  {
    id: 'diabetes-with-high-load',
    source: 'illustrative',
    level: 'high',
    refer: true,
    recommendations: ['seeMedical', 'offload'],
    when: (a, f) => a.diabetes && f.hasHighLoad,
  },
  {
    id: 'diabetes',
    source: 'illustrative',
    level: 'moderate',
    refer: false,
    recommendations: ['dailyCheck'],
    when: (a) => a.diabetes,
  },
  {
    id: 'high-load-zone',
    source: 'illustrative',
    level: 'moderate',
    refer: false,
    recommendations: ['offload', 'footwear'],
    when: (_a, f) => f.hasHighLoad,
  },
  {
    id: 'left-right-asymmetry',
    source: 'illustrative',
    level: 'moderate',
    refer: false,
    recommendations: ['offload'],
    when: (_a, f) => f.hasAsymmetry,
  },
  {
    id: 'injury-history',
    source: 'illustrative',
    level: 'moderate',
    refer: false,
    recommendations: ['footwear', 'rest'],
    when: (a) => historyCount(a) >= HISTORY_COUNT_THRESHOLD,
  },
  {
    id: 'baseline-care',
    source: 'Concept deck: ground surfaces reach 50–70°C during Hajj',
    level: 'low',
    refer: false,
    recommendations: ['dailyCheck', 'hotGround'],
    when: () => true,
  },
];

/** Display priority for recommendations; at most MAX_RECOMMENDATIONS are shown. */
export const RECOMMENDATION_PRIORITY: readonly RecommendationKey[] = [
  'seeMedical',
  'offload',
  'footwear',
  'dailyCheck',
  'rest',
  'hotGround',
];

export const MAX_RECOMMENDATIONS = 4;
