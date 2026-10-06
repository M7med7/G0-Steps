import { QUESTION_COUNT, QUESTION_ORDER } from './questions';
import { assessRisk } from './riskAssessment';
import { scenarioAnswers } from './scenarios';
import type { AnswerKey, Language, RiskAnswers, RiskResult, ScenarioName, ScreenName, SensorReadings } from './types';

export const SENSOR_COUNT = 8;

export interface AppState {
  readonly screen: ScreenName;
  readonly language: Language;
  readonly scenario: ScenarioName;
  readonly answers: RiskAnswers;
  /** Which questions have an explicit answer on screen. */
  readonly answered: Readonly<Partial<Record<AnswerKey, true>>>;
  readonly questionIndex: number;
  /** Sensors read so far during the scan, 0–SENSOR_COUNT. */
  readonly scanProgress: number;
  readonly readings: SensorReadings | null;
  /** True when the last sensor read failed; the scan screen offers a retry. */
  readonly sensorError: boolean;
}

type Listener = (state: AppState) => void;

const allAnswered = (): AppState['answered'] =>
  Object.fromEntries(QUESTION_ORDER.map((key) => [key, true])) as AppState['answered'];

export function createInitialState(scenario: ScenarioName = 'moderate'): AppState {
  return {
    screen: 'start',
    language: 'ar',
    scenario,
    answers: scenarioAnswers(scenario),
    answered: {},
    questionIndex: 0,
    scanProgress: 0,
    readings: null,
    sensorError: false,
  };
}

export const isScanComplete = (state: AppState): boolean =>
  state.readings !== null && state.scanProgress >= SENSOR_COUNT;

/** Derived, never stored: the result exists once a scan has finished. */
export function selectResult(state: AppState): RiskResult | null {
  if (!state.readings || !isScanComplete(state)) return null;
  return assessRisk(state.answers, state.readings.pressure);
}

export function currentQuestion(state: AppState): AnswerKey {
  const key = QUESTION_ORDER[state.questionIndex];
  if (!key) throw new Error(`No question at index ${state.questionIndex}`);
  return key;
}

/** Holds app state. Every update replaces the state object; nothing is mutated in place. */
export class ScreeningStore {
  private state: AppState;
  private readonly listeners = new Set<Listener>();

  constructor(initial: AppState = createInitialState()) {
    this.state = initial;
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private update(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  goTo(screen: ScreenName): void {
    const resetQuestions: Partial<AppState> = screen === 'questions' ? { questionIndex: 0 } : {};
    const freshScan: Partial<AppState> = screen === 'scan' ? { scanProgress: 0, readings: null, sensorError: false } : {};
    this.update({ screen, ...resetQuestions, ...freshScan });
  }

  setLanguage(language: Language): void {
    this.update({ language });
  }

  /** Loads a preset: its answers and pressure. Any finished scan is discarded. */
  setScenario(scenario: ScenarioName): void {
    this.update({ scenario, answers: scenarioAnswers(scenario), answered: allAnswered(), readings: null, scanProgress: 0 });
  }

  beginScreening(language: Language): void {
    this.update({
      language,
      answers: scenarioAnswers(this.state.scenario),
      answered: {},
      questionIndex: 0,
      readings: null,
      scanProgress: 0,
      screen: 'questions',
    });
  }

  /** Records the answer and moves on; after the last question the scan starts. */
  answerCurrent(value: boolean): void {
    const key = currentQuestion(this.state);
    const answers = { ...this.state.answers, [key]: value };
    const answered = { ...this.state.answered, [key]: true as const };
    const isLast = this.state.questionIndex >= QUESTION_COUNT - 1;
    this.update(
      isLast
        ? { answers, answered, screen: 'scan', scanProgress: 0, readings: null }
        : { answers, answered, questionIndex: this.state.questionIndex + 1 },
    );
  }

  previousQuestion(): void {
    if (this.state.questionIndex === 0) {
      this.update({ screen: 'start' });
      return;
    }
    this.update({ questionIndex: this.state.questionIndex - 1 });
  }

  setReadings(readings: SensorReadings): void {
    this.update({ readings, sensorError: false });
  }

  setSensorError(): void {
    this.update({ readings: null, scanProgress: 0, sensorError: true });
  }

  setScanProgress(progress: number): void {
    this.update({ scanProgress: Math.max(0, Math.min(SENSOR_COUNT, progress)) });
  }

  /** Deep links into later screens skip the questions, so treat every answer as given. */
  markAllAnswered(): void {
    this.update({ answered: allAnswered() });
  }
}
