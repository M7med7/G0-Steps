import { emptyAnswers } from './questions';
import type { AnswerKey, PressureMap, RiskAnswers, ScenarioName } from './types';

export interface Scenario {
  readonly answers: Partial<Record<AnswerKey, boolean>>;
  readonly pressure: PressureMap;
}

/** Preset demo scenarios. Values are invented for the prototype, not measurements. */
export const SCENARIOS: Readonly<Record<ScenarioName, Scenario>> = {
  low: {
    answers: {},
    pressure: {
      L: { hallux: 0.48, medialForefoot: 0.55, lateralForefoot: 0.42, heel: 0.6 },
      R: { hallux: 0.5, medialForefoot: 0.57, lateralForefoot: 0.44, heel: 0.62 },
    },
  },
  moderate: {
    answers: { previousFootInjury: true, unusualFootwear: true },
    pressure: {
      L: { hallux: 0.6, medialForefoot: 0.58, lateralForefoot: 0.5, heel: 0.62 },
      R: { hallux: 0.86, medialForefoot: 0.66, lateralForefoot: 0.52, heel: 0.64 },
    },
  },
  high: {
    answers: { diabetes: true, numbness: true },
    pressure: {
      L: { hallux: 0.52, medialForefoot: 0.55, lateralForefoot: 0.46, heel: 0.6 },
      R: { hallux: 0.58, medialForefoot: 0.91, lateralForefoot: 0.5, heel: 0.63 },
    },
  },
};

export function scenarioAnswers(name: ScenarioName): RiskAnswers {
  return { ...emptyAnswers(), ...SCENARIOS[name].answers };
}
