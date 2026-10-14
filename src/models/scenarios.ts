import { emptyAnswers, emptyExam, QUESTIONS, UNANSWERED } from './questions';
import type { Answer, AnswerKey, ExamFindings, ExamKey, PressureMap, Response, RiskAnswers, ScenarioName, Side } from './types';

type Shorthand = Answer | readonly [Answer, Side];

export interface Scenario {
  /** Answers not listed are "no". */
  readonly answers: Partial<Record<AnswerKey, Shorthand>>;
  /** Exam findings not listed are "no". */
  readonly exam: Partial<Record<ExamKey, Shorthand>>;
  readonly pressure: PressureMap;
}

/** Preset demo scenarios. Values are invented for the prototype, not measurements. */
export const SCENARIOS: Readonly<Record<ScenarioName, Scenario>> = {
  low: {
    answers: { selfInspection: 'yes' },
    exam: {},
    pressure: {
      L: { hallux: 0.48, medialForefoot: 0.55, lateralForefoot: 0.42, heel: 0.6 },
      R: { hallux: 0.5, medialForefoot: 0.57, lateralForefoot: 0.44, heel: 0.62 },
    },
  },
  moderate: {
    answers: { footwear: 'yes', exposure: 'yes', selfInspection: 'yes' },
    exam: { callus: ['yes', 'R'] },
    pressure: {
      L: { hallux: 0.6, medialForefoot: 0.58, lateralForefoot: 0.5, heel: 0.62 },
      R: { hallux: 0.86, medialForefoot: 0.66, lateralForefoot: 0.52, heel: 0.64 },
    },
  },
  high: {
    answers: { diabetes: 'yes', numbness: ['yes', 'both'], selfInspection: 'no' },
    exam: { lossOfSensation: ['yes', 'both'], blister: ['yes', 'R'] },
    pressure: {
      L: { hallux: 0.52, medialForefoot: 0.55, lateralForefoot: 0.46, heel: 0.6 },
      R: { hallux: 0.58, medialForefoot: 0.91, lateralForefoot: 0.5, heel: 0.63 },
    },
  },
  urgent: {
    answers: { diabetes: 'yes', infectionSigns: ['yes', 'L'], feverish: 'yes', selfInspection: 'yes' },
    exam: { redness: ['yes', 'L'], swelling: ['yes', 'L'], spreadingInfection: ['yes', 'L'] },
    pressure: {
      L: { hallux: 0.5, medialForefoot: 0.54, lateralForefoot: 0.45, heel: 0.58 },
      R: { hallux: 0.52, medialForefoot: 0.56, lateralForefoot: 0.47, heel: 0.6 },
    },
  },
};

const expand = (value: Shorthand): Response =>
  typeof value === 'string' ? { answer: value, side: null } : { answer: value[0], side: value[1] };

function fill<K extends string>(empty: Readonly<Record<K, Response>>, given: Partial<Record<K, Shorthand>>): Readonly<Record<K, Response>> {
  const keys = Object.keys(empty) as K[];
  return Object.fromEntries(keys.map((key) => [key, expand(given[key] ?? 'no')])) as Record<K, Response>;
}

/**
 * The scenario's answers. Follow-ups only exist after a "yes" to their parent, so they stay unanswered otherwise,
 * as they would on screen.
 */
export function scenarioAnswers(name: ScenarioName): RiskAnswers {
  const filled = fill(emptyAnswers(), SCENARIOS[name].answers);
  const followUps = QUESTIONS.flatMap(({ key, followUp }) =>
    followUp && filled[key].answer !== 'yes' ? [[followUp, UNANSWERED] as const] : [],
  );
  return { ...filled, ...Object.fromEntries(followUps) };
}

export const scenarioExam = (name: ScenarioName): ExamFindings => fill(emptyExam(), SCENARIOS[name].exam);
