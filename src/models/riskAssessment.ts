import {
  ASYMMETRY_GAP,
  CATEGORY_RANK,
  HIGH_LOAD,
  MAX_RECOMMENDATIONS,
  RAISED_LOAD,
  RECOMMENDATION_PRIORITY,
  RULES,
  type RuleInput,
  type ZoneFindings,
} from './rules';
import {
  FEET,
  ZONES,
  type ActionCategory,
  type ExamFindings,
  type Foot,
  type PressureMap,
  type RiskAnswers,
  type ScreeningResult,
  type ZoneFlag,
  type ZoneState,
} from './types';

const otherFoot = (foot: Foot): Foot => (foot === 'L' ? 'R' : 'L');

export function zoneState(load: number): ZoneState {
  if (load >= HIGH_LOAD) return 'high';
  if (load >= RAISED_LOAD) return 'elevated';
  return 'normal';
}

export function findZoneFlags(pressure: PressureMap): ZoneFindings {
  const flags: ZoneFlag[] = [];
  for (const foot of FEET) {
    for (const zone of ZONES) {
      const load = pressure[foot][zone];
      const opposite = pressure[otherFoot(foot)][zone];
      if (load >= HIGH_LOAD) {
        flags.push({ foot, zone, reason: 'highLoad' });
      } else if (load - opposite >= ASYMMETRY_GAP) {
        flags.push({ foot, zone, reason: 'asymmetry' });
      }
    }
  }
  return {
    flags,
    hasHighLoad: flags.some((f) => f.reason === 'highLoad'),
    hasAsymmetry: ZONES.some((zone) => Math.abs(pressure.L[zone] - pressure.R[zone]) >= ASYMMETRY_GAP),
  };
}

const ruleInput = (answers: RiskAnswers, exam: ExamFindings, pressure: PressureMap | null): RuleInput => ({
  answers,
  exam,
  pressure: pressure ? findZoneFlags(pressure) : null,
});

/** True when the questions or exam already show an urgent finding, so routine device testing stops. */
export function hasUrgentFinding(answers: RiskAnswers, exam: ExamFindings): boolean {
  const input = ruleInput(answers, exam, null);
  return RULES.some((rule) => rule.category === 'urgent' && rule.when(input));
}

/**
 * Pure: the same answers, exam and pressure always give the same result.
 * `pressure` is null when there is no reading; that alone makes the assessment incomplete unless something outranks it.
 */
export function assessScreening(answers: RiskAnswers, exam: ExamFindings, pressure: PressureMap | null): ScreeningResult {
  const input = ruleInput(answers, exam, pressure);
  const fired = RULES.filter((rule) => rule.when(input));

  const category = fired.reduce<ActionCategory>(
    (highest, rule) => (CATEGORY_RANK[rule.category] > CATEGORY_RANK[highest] ? rule.category : highest),
    'low',
  );
  const suggested = new Set(fired.flatMap((rule) => rule.recommendations));
  // An urgent case goes to a clinician now; "today" and "finish the check" would only contradict that.
  if (category === 'urgent') {
    suggested.delete('seeMedicalToday');
    suggested.delete('completeCheck');
  }

  return {
    category,
    refer: category === 'urgent' || category === 'high',
    stopTesting: category === 'urgent',
    zoneFlags: input.pressure?.flags ?? [],
    recommendations: RECOMMENDATION_PRIORITY.filter((key) => suggested.has(key)).slice(0, MAX_RECOMMENDATIONS),
    firedRules: fired.map((rule) => rule.id),
  };
}
