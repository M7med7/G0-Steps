import type { AnswerKey, RiskAnswers } from './types';

/** The six risk questions, in the order they are asked (from the concept deck, slide 15). */
export const QUESTION_ORDER: readonly AnswerKey[] = [
  'diabetes',
  'previousFootInjury',
  'currentPain',
  'numbness',
  'currentWound',
  'unusualFootwear',
];

export const QUESTION_COUNT = QUESTION_ORDER.length;

export function emptyAnswers(): RiskAnswers {
  return {
    diabetes: false,
    previousFootInjury: false,
    currentPain: false,
    numbness: false,
    currentWound: false,
    unusualFootwear: false,
  };
}
