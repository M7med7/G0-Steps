import { suggestedLocale } from './pilgrimCards';
import { DEFAULT_CALIBRATION, type Calibration } from './pressureProtocol';
import { emptyAnswers, emptyExam, isQuestionComplete, QUESTION_COUNT, questionAt, withAnswer, type QuestionDef } from './questions';
import { assessScreening, hasUrgentFinding } from './riskAssessment';
import { scenarioAnswers, scenarioExam } from './scenarios';
import {
  PILGRIM_SCREENS,
  type Answer,
  type CalibrationStep,
  type DeviceStatus,
  type ExamFindings,
  type ExamKey,
  type Language,
  type Locale,
  type PilgrimProfile,
  type PressureMap,
  type RiskAnswers,
  type ScenarioName,
  type ScreeningResult,
  type ScreenName,
  type SensorErrorReason,
  type SensorMode,
  type SensorReadings,
  type Side,
} from './types';

export const SENSOR_COUNT = 8;

export type CardError = 'empty' | 'unknown';

export interface AppState {
  readonly screen: ScreenName;
  /** Staff screens: identify, exam, the clinical report and the volunteer list. */
  readonly language: Language;
  /** The pilgrim's screens: handover, questions, scan and result. */
  readonly locale: Locale;
  readonly scenario: ScenarioName;
  /** From the scanned card, for this screening only. Null when the pilgrim has no card. */
  readonly profile: PilgrimProfile | null;
  readonly cardError: CardError | null;
  readonly exam: ExamFindings;
  readonly answers: RiskAnswers;
  readonly questionIndex: number;
  /** Sensors read so far during the scan, 0–SENSOR_COUNT. */
  readonly scanProgress: number;
  readonly readings: SensorReadings | null;
  /** Set when the last sensor read failed; the scan screen explains why and offers a retry. */
  readonly sensorError: SensorErrorReason | null;
  readonly sensorMode: SensorMode;
  readonly deviceStatus: DeviceStatus;
  /** The latest calibrated frame from a connected device, shown live while scanning. */
  readonly livePressure: PressureMap | null;
  /** Calibration for the real ESP32. The fake device always uses the default. */
  readonly calibration: Calibration;
  readonly calibrating: CalibrationStep | null;
  /** Sensors (by index in SENSOR_ORDER) that didn't respond during the last reference press. */
  readonly weakSensors: readonly number[];
  /** The team's demo drawer (scenarios, sensor source, calibration). Closed by default so the app looks like the product. */
  readonly demoOpen: boolean;
}

type Listener = (state: AppState) => void;

/** Everything that belongs to one pilgrim's screening, cleared for the next one. */
const freshScreening = (): Pick<
  AppState,
  'profile' | 'cardError' | 'exam' | 'answers' | 'questionIndex' | 'scanProgress' | 'readings' | 'sensorError' | 'livePressure'
> => ({
  profile: null,
  cardError: null,
  exam: emptyExam(),
  answers: emptyAnswers(),
  questionIndex: 0,
  scanProgress: 0,
  readings: null,
  sensorError: null,
  livePressure: null,
});

export function createInitialState(scenario: ScenarioName = 'moderate', calibration: Calibration = DEFAULT_CALIBRATION): AppState {
  return {
    screen: 'identify',
    language: 'ar',
    locale: 'ar',
    scenario,
    ...freshScreening(),
    sensorMode: 'preset',
    deviceStatus: 'disconnected',
    calibration,
    calibrating: null,
    weakSensors: [],
    demoOpen: false,
  };
}

/** True while a device (real or fake) supplies the pressure instead of a preset. */
export const usesDevice = (state: AppState): boolean => state.sensorMode !== 'preset';

/**
 * Anything on screen that isn't from the real board is simulated and must be labelled.
 * The volunteer list is invented, and every card the prototype accepts is a sample card.
 */
export const showsSimulatedData = (state: AppState): boolean =>
  state.sensorMode !== 'esp32' || state.screen === 'volunteer' || state.profile !== null;

export const isScanComplete = (state: AppState): boolean =>
  state.readings !== null && state.scanProgress >= SENSOR_COUNT;

/** An urgent finding in the exam or the answers stops routine device testing: no scan. */
export const isTestingStopped = (state: AppState): boolean => hasUrgentFinding(state.answers, state.exam);

/** Derived, never stored: the result exists once a scan has finished, or straight away when testing stopped. */
export function selectResult(state: AppState): ScreeningResult | null {
  if (state.readings && isScanComplete(state)) return assessScreening(state.answers, state.exam, state.readings.pressure);
  if (isTestingStopped(state)) return assessScreening(state.answers, state.exam, null);
  return null;
}

export const currentQuestion = (state: AppState): QuestionDef => questionAt(state.questionIndex);

export const isPilgrimScreen = (screen: ScreenName): boolean => PILGRIM_SCREENS.includes(screen);

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
    const freshScan: Partial<AppState> =
      screen === 'scan' ? { scanProgress: 0, readings: null, sensorError: null, livePressure: null } : {};
    this.update({ screen, ...resetQuestions, ...freshScan });
  }

  setDemoOpen(demoOpen: boolean): void {
    this.update({ demoOpen });
  }

  setLanguage(language: Language): void {
    this.update({ language });
  }

  setLocale(locale: Locale): void {
    this.update({ locale });
  }

  /** Loads a preset: its answers, exam and pressure. Any finished scan is discarded. */
  setScenario(scenario: ScenarioName): void {
    this.update({ scenario, answers: scenarioAnswers(scenario), exam: scenarioExam(scenario), readings: null, scanProgress: 0 });
  }

  /** Deep links into later screens skip the earlier steps, so they get the scenario's answers and exam. */
  fillFromScenario(): void {
    this.update({ answers: scenarioAnswers(this.state.scenario), exam: scenarioExam(this.state.scenario) });
  }

  /** Clears the last pilgrim's screening and goes back to the card scan. */
  newScreening(): void {
    this.update({ ...freshScreening(), screen: 'identify' });
  }

  // ------------------------------------------------------------ step 1: identify

  /** A recognised card, or null to continue without one. The pilgrim's screens open in the card's likely language. */
  identify(profile: PilgrimProfile | null): void {
    this.update({
      profile,
      cardError: null,
      locale: profile ? suggestedLocale(profile) : this.state.locale,
      screen: 'exam',
    });
  }

  setCardError(cardError: CardError): void {
    this.update({ cardError });
  }

  // ------------------------------------------------------------ step 2: the volunteer's exam

  setExamAnswer(key: ExamKey, answer: Answer): void {
    this.update({ exam: { ...this.state.exam, [key]: withAnswer(this.state.exam[key], answer) } });
  }

  setExamSide(key: ExamKey, side: Side): void {
    const response = this.state.exam[key];
    if (response.answer !== 'yes') return;
    this.update({ exam: { ...this.state.exam, [key]: { ...response, side } } });
  }

  /** An urgent finding skips the device steps and goes straight to the report. */
  finishExam(): void {
    this.update({ screen: isTestingStopped(this.state) ? 'result' : 'handover' });
  }

  // ------------------------------------------------------------ step 3: the pilgrim's questions

  /**
   * Records the current question's answer. "No" and "Unsure" move on at once; a "yes" that asks for a side or a
   * follow-up stays on the card until those are given and the pilgrim presses Next.
   */
  answerQuestion(answer: Answer): void {
    const question = currentQuestion(this.state);
    const answers: RiskAnswers = {
      ...this.state.answers,
      [question.key]: withAnswer(this.state.answers[question.key], answer),
      ...(question.followUp && answer !== 'yes' ? { [question.followUp]: { answer: null, side: null } } : {}),
    };
    const hasExtras = question.asksSide || question.followUp !== null;
    if (answer === 'yes' && hasExtras) this.update({ answers });
    else this.advance(answers);
  }

  setQuestionSide(side: Side): void {
    const { key } = currentQuestion(this.state);
    const response = this.state.answers[key];
    if (response.answer !== 'yes') return;
    this.update({ answers: { ...this.state.answers, [key]: { ...response, side } } });
  }

  answerFollowUp(answer: Answer): void {
    const { followUp } = currentQuestion(this.state);
    if (!followUp || this.state.answers[currentQuestion(this.state).key].answer !== 'yes') return;
    this.update({ answers: { ...this.state.answers, [followUp]: { answer, side: null } } });
  }

  /** Moves on once the current question is complete. */
  nextQuestion(): void {
    if (isQuestionComplete(currentQuestion(this.state), this.state.answers)) this.advance(this.state.answers);
  }

  previousQuestion(): void {
    if (this.state.questionIndex === 0) {
      this.update({ screen: 'handover' });
      return;
    }
    this.update({ questionIndex: this.state.questionIndex - 1 });
  }

  /** After the last question the scan starts, unless an answer stopped testing. */
  private advance(answers: RiskAnswers): void {
    const isLast = this.state.questionIndex >= QUESTION_COUNT - 1;
    if (!isLast) {
      this.update({ answers, questionIndex: this.state.questionIndex + 1 });
      return;
    }
    const stopped = hasUrgentFinding(answers, this.state.exam);
    this.update({ answers, screen: stopped ? 'result' : 'scan', scanProgress: 0, readings: null, sensorError: null });
  }

  // ------------------------------------------------------------ step 4: the scan

  setReadings(readings: SensorReadings): void {
    this.update({ readings, sensorError: null });
  }

  setSensorError(reason: SensorErrorReason): void {
    this.update({ readings: null, scanProgress: 0, sensorError: reason });
  }

  /** Switching source discards any scan in progress; the controller connects or disconnects devices. */
  setSensorMode(sensorMode: SensorMode): void {
    this.update({ sensorMode, deviceStatus: 'disconnected', livePressure: null, readings: null, scanProgress: 0, sensorError: null });
  }

  setDeviceStatus(deviceStatus: DeviceStatus): void {
    this.update(deviceStatus === 'connected' ? { deviceStatus } : { deviceStatus, livePressure: null, calibrating: null });
  }

  setLivePressure(livePressure: PressureMap): void {
    this.update({ livePressure });
  }

  setCalibrating(calibrating: CalibrationStep | null): void {
    this.update({ calibrating });
  }

  setCalibration(calibration: Calibration, weakSensors: readonly number[] = []): void {
    this.update({ calibration, weakSensors, calibrating: null });
  }

  setScanProgress(progress: number): void {
    this.update({ scanProgress: Math.max(0, Math.min(SENSOR_COUNT, progress)) });
  }
}
