import { EXAM_ITEMS } from './questions';
import type { ActionCategory, ExamFindings, RecommendationKey, Response, RiskAnswers, ZoneFlag } from './types';

/*
 * Every risk rule lives in this file. Each one names its source, or is tagged 'illustrative'.
 *
 * The categories come from the team's proposed action-category sheet (2026-10-09). The sheet itself says these are
 * proposed action categories that need clinical review and prospective validation, not injury probabilities.
 * Rules that map a sheet row onto our questions in a way the sheet doesn't spell out are tagged 'illustrative' and
 * need sign-off from the medical members.
 */

/** Relative load at or above this marks a zone as high pressure. */
export const HIGH_LOAD = 0.8;
/** Relative load at or above this marks a zone as raised (shown amber, not flagged). */
export const RAISED_LOAD = 0.65;
/** Left/right difference in the same zone that counts as asymmetric loading. */
export const ASYMMETRY_GAP = 0.3;

/** References from the action-category sheet, plus the ADA exam report for monofilament and pulses. */
export const SOURCES = {
  apma: 'APMA: Diabetic wound care',
  iwgdfPrevention: 'IWGDF prevention guideline (2023)',
  hajj2014: 'Foot injuries among Hajj pilgrims with and without diabetes (2014)',
  iwgdfInfection: 'IWGDF/IDSA diabetes-related foot infection guideline (2023)',
  iwgdfCharcot: 'IWGDF Charcot guideline (2023)',
  adaExam: 'ADA task force: comprehensive foot examination and risk assessment (2008)',
  sheetUrgent: 'Action-category sheet, urgent row (2026-10-09)',
  sheetSafety: 'Action-category sheet: device safety rule, to validate (2026-10-09)',
} as const;

const cite = (...keys: (keyof typeof SOURCES)[]): string => keys.map((key) => SOURCES[key]).join('; ');

export interface ZoneFindings {
  readonly flags: readonly ZoneFlag[];
  readonly hasHighLoad: boolean;
  readonly hasAsymmetry: boolean;
}

export interface RuleInput {
  readonly answers: RiskAnswers;
  readonly exam: ExamFindings;
  /** Null when there is no pressure reading (the scan failed, or was skipped for an urgent finding). */
  readonly pressure: ZoneFindings | null;
  /** False when the reading came from sensors that failed calibration, so its zones can't be trusted. */
  readonly isPressureReliable: boolean;
}

export interface RiskRule {
  readonly id: string;
  readonly source: string;
  readonly category: ActionCategory;
  readonly recommendations: readonly RecommendationKey[];
  readonly when: (input: RuleInput) => boolean;
}

const yes = (response: Response): boolean => response.answer === 'yes';
const unsure = (response: Response): boolean => response.answer === 'unsure';

const ESSENTIAL = EXAM_ITEMS.filter((item) => item.group === 'essential').map((item) => item.key);
const URGENT_SIGNS = EXAM_ITEMS.filter((item) => item.group === 'urgent').map((item) => item.key);
const INSPECTION = EXAM_ITEMS.filter((item) => item.group === 'inspect').map((item) => item.key);

/** Neuropathy found on exam or reported by the pilgrim. */
const hasNeuropathy = ({ answers, exam }: RuleInput): boolean => yes(exam.lossOfSensation) || yes(answers.numbness);

/** A "vulnerable foot" in the sheet's sense: diabetes, neuropathy, poor circulation or a past ulcer. */
const isVulnerable = (input: RuleInput): boolean =>
  yes(input.answers.diabetes) || hasNeuropathy(input) || yes(input.exam.reducedPulses) || yes(input.answers.ulcerHistory);

const hasMinorLesion = ({ answers, exam }: RuleInput): boolean => yes(exam.blister) || yes(answers.skinBreak);

export const RULES: readonly RiskRule[] = [
  // ---------------------------------------------------------------- urgent override
  {
    id: 'spreading-infection',
    source: cite('iwgdfInfection'),
    category: 'urgent',
    recommendations: ['seeMedicalNow'],
    when: ({ exam }) => yes(exam.spreadingInfection),
  },
  {
    id: 'infection-with-fever',
    source: cite('iwgdfInfection'),
    category: 'urgent',
    recommendations: ['seeMedicalNow'],
    when: ({ answers }) => yes(answers.infectionSigns) && yes(answers.feverish),
  },
  {
    id: 'hot-swollen-neuropathic-foot',
    source: cite('iwgdfCharcot'),
    category: 'urgent',
    recommendations: ['seeMedicalNow'],
    when: (input) => yes(input.exam.hotSwollenFoot) && hasNeuropathy(input),
  },
  {
    id: 'cold-pale-foot',
    source: cite('sheetUrgent'),
    category: 'urgent',
    recommendations: ['seeMedicalNow'],
    when: ({ exam }) => yes(exam.coldPaleFoot),
  },
  {
    id: 'cannot-bear-weight',
    source: cite('sheetUrgent'),
    category: 'urgent',
    recommendations: ['seeMedicalNow'],
    when: ({ answers, exam }) => yes(exam.majorTrauma) || yes(answers.cannotBearWeight),
  },
  {
    // Pain that stops walking is read as "inability to bear weight".
    id: 'pain-stops-walking',
    source: 'illustrative',
    category: 'urgent',
    recommendations: ['seeMedicalNow'],
    when: ({ answers }) => yes(answers.painStopsWalking),
  },

  // ---------------------------------------------------------------- high concern: priority clinical review
  {
    id: 'loss-of-sensation',
    source: cite('iwgdfPrevention', 'adaExam'),
    category: 'high',
    recommendations: ['seeMedicalToday', 'dailyCheck'],
    when: ({ exam }) => yes(exam.lossOfSensation),
  },
  {
    id: 'poor-circulation',
    source: cite('iwgdfPrevention', 'adaExam'),
    category: 'high',
    recommendations: ['seeMedicalToday', 'dailyCheck'],
    when: ({ exam }) => yes(exam.reducedPulses),
  },
  {
    id: 'ulcer-history',
    source: cite('iwgdfPrevention'),
    category: 'high',
    recommendations: ['seeMedicalToday', 'dailyCheck'],
    when: ({ answers }) => yes(answers.ulcerHistory),
  },
  {
    id: 'open-wound',
    source: cite('apma', 'iwgdfPrevention'),
    category: 'high',
    recommendations: ['seeMedicalToday', 'protectSkin'],
    when: ({ exam }) => yes(exam.openWound),
  },
  {
    id: 'local-infection-signs',
    source: cite('iwgdfInfection'),
    category: 'high',
    recommendations: ['seeMedicalToday', 'protectSkin'],
    when: ({ answers }) => yes(answers.infectionSigns),
  },
  {
    id: 'lesion-on-vulnerable-foot',
    source: cite('apma', 'iwgdfPrevention', 'hajj2014'),
    category: 'high',
    recommendations: ['seeMedicalToday', 'protectSkin'],
    when: (input) => hasMinorLesion(input) && isVulnerable(input),
  },
  {
    // Hot, red and swollen without neuropathy isn't the sheet's Charcot row, but still needs a clinician.
    id: 'hot-swollen-foot',
    source: 'illustrative',
    category: 'high',
    recommendations: ['seeMedicalToday'],
    when: ({ exam }) => yes(exam.hotSwollenFoot),
  },
  {
    // The volunteer couldn't rule an urgent sign out, so a clinician should.
    id: 'urgent-sign-unsure',
    source: 'illustrative',
    category: 'high',
    recommendations: ['seeMedicalToday'],
    when: ({ exam }) => URGENT_SIGNS.some((key) => unsure(exam[key])),
  },

  // ---------------------------------------------------------------- incomplete assessment
  {
    id: 'exam-not-finished',
    source: cite('sheetSafety'),
    category: 'incomplete',
    recommendations: ['completeCheck'],
    when: ({ exam }) => EXAM_ITEMS.some((item) => exam[item.key].answer === null),
  },
  {
    id: 'sensation-or-circulation-unclear',
    source: cite('sheetSafety'),
    category: 'incomplete',
    recommendations: ['completeCheck'],
    when: ({ exam }) => ESSENTIAL.some((key) => unsure(exam[key])),
  },
  {
    id: 'no-pressure-reading',
    source: cite('sheetSafety'),
    category: 'incomplete',
    recommendations: ['completeCheck'],
    when: ({ pressure }) => pressure === null,
  },
  {
    id: 'pressure-unreliable',
    source: cite('sheetSafety'),
    category: 'incomplete',
    recommendations: ['completeCheck'],
    when: ({ pressure, isPressureReliable }) => pressure !== null && !isPressureReliable,
  },

  // ---------------------------------------------------------------- moderate concern
  {
    id: 'footwear-rubbing',
    source: cite('hajj2014', 'iwgdfPrevention'),
    category: 'moderate',
    recommendations: ['reduceFriction', 'footwear'],
    when: ({ answers }) => yes(answers.footwear),
  },
  {
    id: 'heavy-walking-or-exposure',
    source: cite('hajj2014'),
    category: 'moderate',
    recommendations: ['reduceFriction', 'keepDry', 'hotGround'],
    when: ({ answers }) => yes(answers.exposure),
  },
  {
    id: 'callus-or-deformity',
    source: cite('iwgdfPrevention'),
    category: 'moderate',
    recommendations: ['reduceFriction', 'footwear'],
    when: ({ exam }) => yes(exam.callus) || yes(exam.deformity),
  },
  {
    id: 'minor-skin-finding',
    source: cite('apma', 'iwgdfPrevention'),
    category: 'moderate',
    recommendations: ['protectSkin', 'reduceFriction'],
    when: (input) => hasMinorLesion(input) || yes(input.exam.redness) || yes(input.exam.swelling),
  },
  {
    id: 'pain-reported',
    source: 'illustrative',
    category: 'moderate',
    recommendations: ['reduceFriction'],
    when: ({ answers }) => yes(answers.pain),
  },
  {
    // Self-reported; the monofilament decides loss of protective sensation.
    id: 'numbness-reported',
    source: 'illustrative',
    category: 'moderate',
    recommendations: ['dailyCheck'],
    when: ({ answers }) => yes(answers.numbness),
  },
  {
    id: 'minor-injury',
    source: 'illustrative',
    category: 'moderate',
    recommendations: ['protectSkin'],
    when: ({ answers }) => yes(answers.injury),
  },
  {
    // The sheet asks for a repeatable unexplained sensor finding; the station takes one scan, so this needs review.
    id: 'pressure-flag',
    source: 'illustrative',
    category: 'moderate',
    recommendations: ['reduceFriction', 'footwear'],
    when: ({ pressure }) => pressure !== null && (pressure.hasHighLoad || pressure.hasAsymmetry),
  },
  {
    id: 'inspection-unsure',
    source: 'illustrative',
    category: 'moderate',
    recommendations: ['dailyCheck'],
    when: ({ exam }) => INSPECTION.some((key) => unsure(exam[key])),
  },

  // ---------------------------------------------------------------- low concern and advice for everyone
  {
    id: 'cannot-self-inspect',
    source: 'illustrative',
    category: 'low',
    recommendations: ['companionCheck'],
    when: ({ answers }) => answers.selfInspection.answer === 'no',
  },
  {
    id: 'baseline-care',
    source: 'Concept deck: ground surfaces reach 50–70°C during Hajj; ' + cite('iwgdfPrevention'),
    category: 'low',
    recommendations: ['dailyCheck', 'hotGround', 'footwear'],
    when: () => true,
  },
];

/**
 * Highest applicable category wins. Incomplete sits above moderate: a missing exam could hide a high-concern finding,
 * so the station never reports "low" or "moderate" without one. A wound or urgent finding still outranks it.
 */
export const CATEGORY_RANK: Readonly<Record<ActionCategory, number>> = { low: 0, moderate: 1, incomplete: 2, high: 3, urgent: 4 };

/** Display priority for recommendations; at most MAX_RECOMMENDATIONS are shown. */
export const RECOMMENDATION_PRIORITY: readonly RecommendationKey[] = [
  'seeMedicalNow',
  'seeMedicalToday',
  'completeCheck',
  'protectSkin',
  'reduceFriction',
  'companionCheck',
  'footwear',
  'keepDry',
  'dailyCheck',
  'hotGround',
];

export const MAX_RECOMMENDATIONS = 4;
