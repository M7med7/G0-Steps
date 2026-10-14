import type { AnswerKey, ExamFindings, ExamKey, FollowUpKey, QuestionKey, Response, RiskAnswers } from './types';

export interface QuestionDef {
  readonly key: QuestionKey;
  /** Ask which foot after a "yes". */
  readonly asksSide: boolean;
  /** Asked on the same card after a "yes". */
  readonly followUp: FollowUpKey | null;
}

/**
 * The ten pilgrim questions, in the order they are asked (team list, 2026-10-09).
 * Questions 1–6 and 10 follow established foot-assessment domains; 7–9 cover acute injury and pilgrimage exposure.
 * The combined list is an adaptation, not a validated instrument.
 */
export const QUESTIONS: readonly QuestionDef[] = [
  { key: 'diabetes', asksSide: false, followUp: null },
  { key: 'ulcerHistory', asksSide: false, followUp: null },
  { key: 'pain', asksSide: true, followUp: 'painStopsWalking' },
  { key: 'numbness', asksSide: true, followUp: null },
  { key: 'skinBreak', asksSide: true, followUp: null },
  { key: 'infectionSigns', asksSide: true, followUp: 'feverish' },
  { key: 'injury', asksSide: true, followUp: 'cannotBearWeight' },
  { key: 'footwear', asksSide: false, followUp: null },
  { key: 'exposure', asksSide: false, followUp: null },
  { key: 'selfInspection', asksSide: false, followUp: null },
];

export const QUESTION_COUNT = QUESTIONS.length;
export const FOLLOW_UPS: readonly FollowUpKey[] = ['painStopsWalking', 'feverish', 'cannotBearWeight'];
export const ANSWER_KEYS: readonly AnswerKey[] = [...QUESTIONS.map((q) => q.key), ...FOLLOW_UPS];

export type ExamGroup = 'inspect' | 'essential' | 'urgent';

export interface ExamItemDef {
  readonly key: ExamKey;
  readonly group: ExamGroup;
}

/** Examine first, then measure: inspect both feet, test sensation and circulation, and look for urgent signs. */
export const EXAM_ITEMS: readonly ExamItemDef[] = [
  { key: 'openWound', group: 'inspect' },
  { key: 'blister', group: 'inspect' },
  { key: 'callus', group: 'inspect' },
  { key: 'deformity', group: 'inspect' },
  { key: 'redness', group: 'inspect' },
  { key: 'swelling', group: 'inspect' },
  { key: 'lossOfSensation', group: 'essential' },
  { key: 'reducedPulses', group: 'essential' },
  { key: 'spreadingInfection', group: 'urgent' },
  { key: 'hotSwollenFoot', group: 'urgent' },
  { key: 'coldPaleFoot', group: 'urgent' },
  { key: 'majorTrauma', group: 'urgent' },
];

export const EXAM_GROUPS: readonly ExamGroup[] = ['inspect', 'essential', 'urgent'];
export const EXAM_KEYS: readonly ExamKey[] = EXAM_ITEMS.map((item) => item.key);

export const UNANSWERED: Response = { answer: null, side: null };

const allUnanswered = <K extends string>(keys: readonly K[]): Readonly<Record<K, Response>> =>
  Object.fromEntries(keys.map((key) => [key, UNANSWERED])) as Record<K, Response>;

export const emptyAnswers = (): RiskAnswers => allUnanswered(ANSWER_KEYS);
export const emptyExam = (): ExamFindings => allUnanswered(EXAM_KEYS);

export function questionAt(index: number): QuestionDef {
  const question = QUESTIONS[index];
  if (!question) throw new Error(`No question at index ${index}`);
  return question;
}

/** A question is done once it has an answer, plus its side and follow-up when a "yes" asks for them. */
export function isQuestionComplete(question: QuestionDef, answers: RiskAnswers): boolean {
  const response = answers[question.key];
  if (response.answer === null) return false;
  if (response.answer !== 'yes') return true;
  if (question.asksSide && response.side === null) return false;
  return question.followUp === null || answers[question.followUp].answer !== null;
}

/** Records an answer. Anything that only applies after a "yes" (side, follow-up) is cleared when the answer isn't yes. */
export function withAnswer(response: Response, answer: Response['answer']): Response {
  return { answer, side: answer === 'yes' ? response.side : null };
}

export const isExamKey = (value: unknown): value is ExamKey =>
  typeof value === 'string' && (EXAM_KEYS as readonly string[]).includes(value);
