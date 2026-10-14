export type Foot = 'L' | 'R';
export type Zone = 'hallux' | 'medialForefoot' | 'lateralForefoot' | 'heel';

export const FEET: readonly Foot[] = ['L', 'R'];
export const ZONES: readonly Zone[] = ['hallux', 'medialForefoot', 'lateralForefoot', 'heel'];

/** Every question and exam item is answered the same way. `null` means not answered yet. */
export type Answer = 'yes' | 'no' | 'unsure';
export const ANSWERS: readonly Answer[] = ['yes', 'no', 'unsure'];
/** Which foot a "yes" refers to, for symptoms and exam findings. */
export type Side = 'L' | 'R' | 'both';
export const SIDES: readonly Side[] = ['R', 'L', 'both'];

export interface Response {
  readonly answer: Answer | null;
  /** Only set for items that ask for a side, and only after a "yes". */
  readonly side: Side | null;
}

/** The ten pilgrim questions (team list, 2026-10-09; the old question 3 is dropped, see ADR-0004). */
export type QuestionKey =
  | 'diabetes'
  | 'ulcerHistory'
  | 'pain'
  | 'numbness'
  | 'skinBreak'
  | 'infectionSigns'
  | 'injury'
  | 'footwear'
  | 'exposure'
  | 'selfInspection';

/** Follow-ups shown on the same card after a "yes" to their parent question. Phrased so "yes" is the worrying answer. */
export type FollowUpKey = 'painStopsWalking' | 'feverish' | 'cannotBearWeight';

export type AnswerKey = QuestionKey | FollowUpKey;
export type RiskAnswers = Readonly<Record<AnswerKey, Response>>;

/** What the medical volunteer records after looking at and testing both feet. */
export type ExamKey =
  | 'openWound'
  | 'blister'
  | 'callus'
  | 'deformity'
  | 'redness'
  | 'swelling'
  | 'lossOfSensation'
  | 'reducedPulses'
  | 'spreadingInfection'
  | 'hotSwollenFoot'
  | 'coldPaleFoot'
  | 'majorTrauma';

export type ExamFindings = Readonly<Record<ExamKey, Response>>;

/** Relative load per sensor, normalized 0–1. Not kPa: FSR402s are not calibrated pressure sensors. */
export type PressureMap = Readonly<Record<Foot, Readonly<Record<Zone, number>>>>;

export interface SensorReadings {
  readonly source: 'simulated' | 'esp32';
  readonly pressure: PressureMap;
  /** Placeholder until a thermal sensor exists. */
  readonly thermal: null;
  /** Placeholder until a camera exists. */
  readonly rgb: null;
  readonly capturedAt: string;
}

/** The team's proposed action categories (2026-10-09 sheet). Not injury probabilities. */
export type ActionCategory = 'low' | 'moderate' | 'high' | 'urgent' | 'incomplete';
export const ACTION_CATEGORIES: readonly ActionCategory[] = ['low', 'moderate', 'high', 'urgent', 'incomplete'];
export type ZoneState = 'normal' | 'elevated' | 'high';
export type FlagReason = 'highLoad' | 'asymmetry';

export interface ZoneFlag {
  readonly foot: Foot;
  readonly zone: Zone;
  readonly reason: FlagReason;
}

export type RecommendationKey =
  | 'seeMedicalNow'
  | 'seeMedicalToday'
  | 'completeCheck'
  | 'reduceFriction'
  | 'protectSkin'
  | 'footwear'
  | 'keepDry'
  | 'dailyCheck'
  | 'companionCheck'
  | 'hotGround';

export interface ScreeningResult {
  readonly category: ActionCategory;
  /** Urgent and high need a clinician. */
  readonly refer: boolean;
  /** Urgent: routine device testing stops and the scan is skipped. */
  readonly stopTesting: boolean;
  readonly zoneFlags: readonly ZoneFlag[];
  readonly recommendations: readonly RecommendationKey[];
  readonly firedRules: readonly string[];
}

export type Sex = 'male' | 'female';

/** What a pilgrim card gives the station. Lives in memory for one screening only; never stored or put in the QR code. */
export interface PilgrimProfile {
  readonly cardId: string;
  readonly name: string;
  readonly age: number;
  readonly sex: Sex;
  readonly nationality: string;
}

export type ScenarioName = 'low' | 'moderate' | 'high' | 'urgent';
/** The staff language: volunteer and clinician screens, the demo drawer and the 3D page. */
export type Language = 'ar' | 'en';

/** Languages a pilgrim can pick. Chosen from the largest Hajj delegations and Nusuk's languages (ADR-0004). */
export type Locale = 'ar' | 'en' | 'ur' | 'id' | 'bn' | 'hi' | 'tr' | 'fr' | 'ms' | 'ha' | 'ru';
export const LOCALES: readonly Locale[] = ['ar', 'en', 'ur', 'id', 'bn', 'hi', 'tr', 'fr', 'ms', 'ha', 'ru'];

/**
 * The screening steps in order: identify the pilgrim, the volunteer's exam, hand the station to the pilgrim,
 * their questions, the scan, then the result. `doctor` is the clinical report of the same screening.
 */
export type ScreenName = 'identify' | 'exam' | 'handover' | 'questions' | 'scan' | 'result' | 'doctor' | 'volunteer';

export const SCREENS: readonly ScreenName[] = ['identify', 'exam', 'handover', 'questions', 'scan', 'result', 'doctor', 'volunteer'];

/** Screens the pilgrim reads, drawn in their language. The rest are for staff, in Arabic or English. */
export const PILGRIM_SCREENS: readonly ScreenName[] = ['handover', 'questions', 'scan', 'result'];

/**
 * Where pressure comes from: preset scenarios, a fake ESP32 that streams the real serial protocol,
 * or the real ESP32 over USB (Web Serial).
 */
export type SensorMode = 'preset' | 'fakeDevice' | 'esp32';
export const SENSOR_MODES: readonly SensorMode[] = ['preset', 'fakeDevice', 'esp32'];
export type DeviceStatus = 'disconnected' | 'connecting' | 'connected' | 'unsupported' | 'error';
/** Why a scan produced no readings. */
export type SensorErrorReason = 'readFailed' | 'noDevice' | 'noData' | 'noFeet';
export type CalibrationStep = 'zero' | 'reference';
export const SCENARIO_NAMES: readonly ScenarioName[] = ['low', 'moderate', 'high', 'urgent'];

const isOneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (values as readonly string[]).includes(value);

export const isScreenName = isOneOf(SCREENS);
export const isScenarioName = isOneOf(SCENARIO_NAMES);
export const isLanguage = isOneOf<Language>(['ar', 'en']);
export const isLocale = isOneOf(LOCALES);
export const isSensorMode = isOneOf(SENSOR_MODES);
export const isCalibrationStep = isOneOf<CalibrationStep>(['zero', 'reference']);
export const isAnswer = isOneOf(ANSWERS);
export const isSide = isOneOf(SIDES);
