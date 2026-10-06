import { describe, expect, it } from 'vitest';
import { emptyAnswers } from './questions';
import { assessRisk, findZoneFlags, zoneState } from './riskAssessment';
import { HIGH_LOAD, MAX_RECOMMENDATIONS, RAISED_LOAD } from './rules';
import { SCENARIOS, scenarioAnswers } from './scenarios';
import type { PressureMap, RiskAnswers } from './types';

const EVEN: PressureMap = {
  L: { hallux: 0.5, medialForefoot: 0.5, lateralForefoot: 0.5, heel: 0.5 },
  R: { hallux: 0.5, medialForefoot: 0.5, lateralForefoot: 0.5, heel: 0.5 },
};
const withLoad = (foot: 'L' | 'R', zone: keyof PressureMap['L'], value: number): PressureMap => ({
  ...EVEN,
  [foot]: { ...EVEN[foot], [zone]: value },
});
const answers = (overrides: Partial<RiskAnswers>): RiskAnswers => ({ ...emptyAnswers(), ...overrides });

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

describe('assessRisk', () => {
  it('returns low risk with baseline care advice when nothing is wrong', () => {
    const result = assessRisk(emptyAnswers(), EVEN);
    expect(result.level).toBe('low');
    expect(result.refer).toBe(false);
    expect(result.recommendations).toEqual(['dailyCheck', 'hotGround']);
  });

  it('treats an open wound as high risk with a referral', () => {
    const result = assessRisk(answers({ currentWound: true }), EVEN);
    expect(result.level).toBe('high');
    expect(result.refer).toBe(true);
    expect(result.recommendations[0]).toBe('seeMedical');
  });

  it('treats diabetes with numbness as high risk with a referral', () => {
    const result = assessRisk(answers({ diabetes: true, numbness: true }), EVEN);
    expect(result.level).toBe('high');
    expect(result.refer).toBe(true);
  });

  it('raises diabetes alone to moderate without a referral', () => {
    const result = assessRisk(answers({ diabetes: true }), EVEN);
    expect(result.level).toBe('moderate');
    expect(result.refer).toBe(false);
  });

  it('raises diabetes plus a high-load zone to high', () => {
    const result = assessRisk(answers({ diabetes: true }), withLoad('L', 'medialForefoot', 0.9));
    expect(result.level).toBe('high');
    expect(result.firedRules).toContain('diabetes-with-high-load');
  });

  it('raises a high-load zone alone to moderate', () => {
    expect(assessRisk(emptyAnswers(), withLoad('R', 'heel', 0.82)).level).toBe('moderate');
  });

  it('needs two history answers before raising risk', () => {
    expect(assessRisk(answers({ currentPain: true }), EVEN).level).toBe('low');
    expect(assessRisk(answers({ currentPain: true, unusualFootwear: true }), EVEN).level).toBe('moderate');
  });

  it('never returns more than the maximum number of recommendations', () => {
    const everything = answers({ diabetes: true, numbness: true, currentWound: true, currentPain: true, unusualFootwear: true });
    const result = assessRisk(everything, withLoad('R', 'hallux', 0.95));
    expect(result.recommendations.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    expect(new Set(result.recommendations).size).toBe(result.recommendations.length);
  });

  it.each([
    ['low', 'low', false],
    ['moderate', 'moderate', false],
    ['high', 'high', true],
  ] as const)('the %s scenario assesses as %s risk', (name, level, refer) => {
    const result = assessRisk(scenarioAnswers(name), SCENARIOS[name].pressure);
    expect(result.level).toBe(level);
    expect(result.refer).toBe(refer);
  });
});
