import {
  ASYMMETRY_GAP,
  HIGH_LOAD,
  MAX_RECOMMENDATIONS,
  RAISED_LOAD,
  RECOMMENDATION_PRIORITY,
  RULES,
  type ZoneFindings,
} from './rules';
import { FEET, ZONES, type Foot, type PressureMap, type RiskAnswers, type RiskLevel, type RiskResult, type ZoneFlag, type ZoneState } from './types';

const LEVEL_RANK: Readonly<Record<RiskLevel, number>> = { low: 0, moderate: 1, high: 2 };

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

/** Pure: same answers and pressure always give the same result. */
export function assessRisk(answers: RiskAnswers, pressure: PressureMap): RiskResult {
  const findings = findZoneFlags(pressure);
  const fired = RULES.filter((rule) => rule.when(answers, findings));

  const level = fired.reduce<RiskLevel>(
    (highest, rule) => (LEVEL_RANK[rule.level] > LEVEL_RANK[highest] ? rule.level : highest),
    'low',
  );
  const suggested = new Set(fired.flatMap((rule) => rule.recommendations));

  return {
    level,
    refer: fired.some((rule) => rule.refer),
    zoneFlags: findings.flags,
    recommendations: RECOMMENDATION_PRIORITY.filter((key) => suggested.has(key)).slice(0, MAX_RECOMMENDATIONS),
    firedRules: fired.map((rule) => rule.id),
  };
}
