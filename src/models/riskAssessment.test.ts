import { describe, expect, it } from 'vitest';
import { emptyAnswers, emptyExam, EXAM_KEYS } from './questions';
import { assessScreening, findZoneFlags, hasUrgentFinding, zoneState } from './riskAssessment';
import { CATEGORY_RANK, HIGH_LOAD, MAX_RECOMMENDATIONS, RAISED_LOAD, RULES } from './rules';
import { SCENARIOS, scenarioAnswers, scenarioExam } from './scenarios';
import type { Answer, AnswerKey, ExamFindings, ExamKey, PressureMap, RiskAnswers, ScenarioName } from './types';

const EVEN: PressureMap = {
  L: { hallux: 0.5, medialForefoot: 0.5, lateralForefoot: 0.5, heel: 0.5 },
  R: { hallux: 0.5, medialForefoot: 0.5, lateralForefoot: 0.5, heel: 0.5 },
};
const withLoad = (foot: 'L' | 'R', zone: keyof PressureMap['L'], value: number): PressureMap => ({
  ...EVEN,
  [foot]: { ...EVEN[foot], [zone]: value },
});

/** Every question answered "no" (follow-ups stay unasked), with overrides. */
const answers = (overrides: Partial<Record<AnswerKey, Answer>> = {}): RiskAnswers => {
  const base = emptyAnswers();
  const no = Object.fromEntries(
    (['diabetes', 'ulcerHistory', 'pain', 'numbness', 'skinBreak', 'infectionSigns', 'injury', 'footwear', 'exposure', 'selfInspection'] as const).map(
      (key) => [key, { answer: 'no', side: null }],
    ),
  );
  const given = Object.fromEntries(Object.entries(overrides).map(([key, answer]) => [key, { answer, side: null }]));
  return { ...base, ...no, ...given };
};

/** A complete exam with every item "no", with overrides. */
const exam = (overrides: Partial<Record<ExamKey, Answer | null>> = {}): ExamFindings => ({
  ...Object.fromEntries(EXAM_KEYS.map((key) => [key, { answer: 'no', side: null }])),
  ...Object.fromEntries(Object.entries(overrides).map(([key, answer]) => [key, { answer, side: null }])),
} as ExamFindings);

describe('zoneState', () => {
  it('classifies load at the thresholds', () => {
    expect(zoneState(RAISED_LOAD - 0.01)).toBe('normal');
    expect(zoneState(RAISED_LOAD)).toBe('elevated');
    expect(zoneState(HIGH_LOAD - 0.01)).toBe('elevated');
    expect(zoneState(HIGH_LOAD)).toBe('high');
  });
});

describe('findZoneFlags', () => {
  it('flags nothing for even, normal loading', () => {
    expect(findZoneFlags(EVEN)).toEqual({ flags: [], hasHighLoad: false, hasAsymmetry: false });
  });

  it('flags a high-load zone on the correct foot', () => {
    const result = findZoneFlags(withLoad('R', 'hallux', 0.86));
    expect(result.flags).toEqual([{ foot: 'R', zone: 'hallux', reason: 'highLoad' }]);
    expect(result.hasHighLoad).toBe(true);
  });

  it('flags asymmetry when one foot carries 0.30 more in the same zone', () => {
    const pressure: PressureMap = { L: { ...EVEN.L, heel: 0.79 }, R: { ...EVEN.R, heel: 0.45 } };
    const result = findZoneFlags(pressure);
    expect(result.flags).toEqual([{ foot: 'L', zone: 'heel', reason: 'asymmetry' }]);
    expect(result.hasAsymmetry).toBe(true);
  });
});

describe('rule table', () => {
  it('every rule cites a source or is tagged illustrative', () => {
    RULES.forEach((rule) => expect(rule.source.trim(), rule.id).not.toBe(''));
  });

  it('rule ids are unique', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
  });

  it('ranks urgent over high over incomplete over moderate over low', () => {
    expect(CATEGORY_RANK.urgent).toBeGreaterThan(CATEGORY_RANK.high);
    expect(CATEGORY_RANK.high).toBeGreaterThan(CATEGORY_RANK.incomplete);
    expect(CATEGORY_RANK.incomplete).toBeGreaterThan(CATEGORY_RANK.moderate);
    expect(CATEGORY_RANK.moderate).toBeGreaterThan(CATEGORY_RANK.low);
  });
});

describe('assessScreening', () => {
  const run = (a: RiskAnswers, e: ExamFindings, p: PressureMap | null = EVEN) => assessScreening(a, e, p);

  it('reports low concern with baseline advice when the exam is complete and nothing is wrong', () => {
    const result = run(answers({ selfInspection: 'yes' }), exam());
    expect(result.category).toBe('low');
    expect(result.refer).toBe(false);
    expect(result.recommendations).toEqual(['footwear', 'dailyCheck', 'hotGround']);
  });

  it('keeps diabetes alone at low concern when sensation and circulation are normal', () => {
    expect(run(answers({ diabetes: 'yes' }), exam()).category).toBe('low');
  });

  describe('urgent override', () => {
    it.each([
      ['spreading infection on exam', answers(), exam({ spreadingInfection: 'yes' }), 'spreading-infection'],
      ['infection signs with fever', answers({ infectionSigns: 'yes', feverish: 'yes' }), exam(), 'infection-with-fever'],
      ['hot swollen foot with loss of sensation', answers(), exam({ hotSwollenFoot: 'yes', lossOfSensation: 'yes' }), 'hot-swollen-neuropathic-foot'],
      ['hot swollen foot with reported numbness', answers({ numbness: 'yes' }), exam({ hotSwollenFoot: 'yes' }), 'hot-swollen-neuropathic-foot'],
      ['sudden cold or pale foot', answers(), exam({ coldPaleFoot: 'yes' }), 'cold-pale-foot'],
      ['major trauma on exam', answers(), exam({ majorTrauma: 'yes' }), 'cannot-bear-weight'],
      ['injury and cannot bear weight', answers({ injury: 'yes', cannotBearWeight: 'yes' }), exam(), 'cannot-bear-weight'],
      ['pain that stops walking', answers({ pain: 'yes', painStopsWalking: 'yes' }), exam(), 'pain-stops-walking'],
    ] as const)('%s', (_name, a, e, rule) => {
      const result = run(a, e);
      expect(result.category).toBe('urgent');
      expect(result.refer).toBe(true);
      expect(result.stopTesting).toBe(true);
      expect(result.firedRules).toContain(rule);
      expect(result.recommendations[0]).toBe('seeMedicalNow');
      expect(hasUrgentFinding(a, e)).toBe(true);
    });

    it('outranks a missing pressure reading and drops advice that contradicts "now"', () => {
      const result = run(answers({ ulcerHistory: 'yes' }), exam({ coldPaleFoot: 'yes' }), null);
      expect(result.category).toBe('urgent');
      expect(result.recommendations).not.toContain('completeCheck');
      expect(result.recommendations).not.toContain('seeMedicalToday');
    });
  });

  describe('high concern', () => {
    it.each([
      ['loss of protective sensation', answers(), exam({ lossOfSensation: 'yes' }), 'loss-of-sensation'],
      ['reduced pulses', answers(), exam({ reducedPulses: 'yes' }), 'poor-circulation'],
      ['previous ulcer or amputation', answers({ ulcerHistory: 'yes' }), exam(), 'ulcer-history'],
      ['open wound on exam', answers(), exam({ openWound: 'yes' }), 'open-wound'],
      ['new redness, swelling or pus without fever', answers({ infectionSigns: 'yes', feverish: 'no' }), exam(), 'local-infection-signs'],
      ['blister on a diabetic foot', answers({ diabetes: 'yes' }), exam({ blister: 'yes' }), 'lesion-on-vulnerable-foot'],
      ['hot swollen foot without neuropathy', answers(), exam({ hotSwollenFoot: 'yes' }), 'hot-swollen-foot'],
      ['an urgent sign the volunteer is unsure of', answers(), exam({ coldPaleFoot: 'unsure' }), 'urgent-sign-unsure'],
    ] as const)('%s', (_name, a, e, rule) => {
      const result = run(a, e);
      expect(result.category).toBe('high');
      expect(result.refer).toBe(true);
      expect(result.stopTesting).toBe(false);
      expect(result.firedRules).toContain(rule);
      expect(result.recommendations[0]).toBe('seeMedicalToday');
    });

    it('outranks an incomplete exam', () => {
      expect(run(answers({ ulcerHistory: 'yes' }), exam({ reducedPulses: null })).category).toBe('high');
    });
  });

  describe('incomplete assessment', () => {
    it('never reports low when an exam item is missing', () => {
      const result = run(answers(), exam({ callus: null }));
      expect(result.category).toBe('incomplete');
      expect(result.refer).toBe(false);
      expect(result.recommendations[0]).toBe('completeCheck');
    });

    it('treats an unsure monofilament or pulse result as incomplete', () => {
      expect(run(answers(), exam({ lossOfSensation: 'unsure' })).firedRules).toContain('sensation-or-circulation-unclear');
      expect(run(answers(), exam({ reducedPulses: 'unsure' })).category).toBe('incomplete');
    });

    it('is incomplete without a pressure reading', () => {
      expect(run(answers(), exam(), null).category).toBe('incomplete');
    });

    it('is incomplete, never low, when the pressure reading is unreliable', () => {
      const result = assessScreening(answers(), exam(), EVEN, false);
      expect(result.category).toBe('incomplete');
      expect(result.firedRules).toContain('pressure-unreliable');
    });

    it('lets a high finding outrank an unreliable reading', () => {
      expect(assessScreening(answers(), exam({ openWound: 'yes' }), EVEN, false).category).toBe('high');
    });

    it('outranks moderate findings', () => {
      expect(run(answers({ footwear: 'yes' }), exam(), null).category).toBe('incomplete');
    });

    it('is the result of an untouched exam', () => {
      expect(run(answers(), emptyExam()).category).toBe('incomplete');
    });
  });

  describe('moderate concern', () => {
    it.each([
      ['rubbing footwear', answers({ footwear: 'yes' }), exam(), EVEN, 'footwear-rubbing'],
      ['heavy walking or heat', answers({ exposure: 'yes' }), exam(), EVEN, 'heavy-walking-or-exposure'],
      ['callus', answers(), exam({ callus: 'yes' }), EVEN, 'callus-or-deformity'],
      ['a blister on a foot that is not vulnerable', answers(), exam({ blister: 'yes' }), EVEN, 'minor-skin-finding'],
      ['redness on exam', answers(), exam({ redness: 'yes' }), EVEN, 'minor-skin-finding'],
      ['pain that still allows walking', answers({ pain: 'yes', painStopsWalking: 'no' }), exam(), EVEN, 'pain-reported'],
      ['numbness the monofilament did not confirm', answers({ numbness: 'yes' }), exam(), EVEN, 'numbness-reported'],
      ['a minor injury', answers({ injury: 'yes', cannotBearWeight: 'no' }), exam(), EVEN, 'minor-injury'],
      ['a high-load zone', answers(), exam(), withLoad('R', 'heel', 0.82), 'pressure-flag'],
      ['an inspection finding the volunteer is unsure of', answers(), exam({ swelling: 'unsure' }), EVEN, 'inspection-unsure'],
    ] as const)('%s', (_name, a, e, p, rule) => {
      const result = run(a, e, p);
      expect(result.category).toBe('moderate');
      expect(result.refer).toBe(false);
      expect(result.firedRules).toContain(rule);
    });
  });

  it('advises a companion check when the pilgrim cannot check their own feet, without raising the category', () => {
    const result = run(answers({ selfInspection: 'no' }), exam());
    expect(result.category).toBe('low');
    expect(result.recommendations).toContain('companionCheck');
  });

  it('ignores "unsure" answers to the pilgrim questions for the category', () => {
    expect(run(answers({ diabetes: 'unsure', footwear: 'unsure' }), exam()).category).toBe('low');
  });

  it('never returns more than the maximum number of recommendations, without repeats', () => {
    const everything = answers({ diabetes: 'yes', numbness: 'yes', footwear: 'yes', exposure: 'yes', selfInspection: 'no', injury: 'yes' });
    const result = run(everything, exam({ blister: 'yes', callus: 'yes' }), withLoad('R', 'hallux', 0.95));
    expect(result.recommendations.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    expect(new Set(result.recommendations).size).toBe(result.recommendations.length);
  });

  it.each([
    ['low', 'low', false],
    ['moderate', 'moderate', false],
    ['high', 'high', true],
    ['urgent', 'urgent', true],
  ] as const)('the %s scenario assesses as %s', (name: ScenarioName, category, refer) => {
    const result = assessScreening(scenarioAnswers(name), scenarioExam(name), SCENARIOS[name].pressure);
    expect(result.category).toBe(category);
    expect(result.refer).toBe(refer);
  });
});
