export type Foot = 'L' | 'R';
export type Zone = 'hallux' | 'medialForefoot' | 'lateralForefoot' | 'heel';

export const FEET: readonly Foot[] = ['L', 'R'];
export const ZONES: readonly Zone[] = ['hallux', 'medialForefoot', 'lateralForefoot', 'heel'];

export type AnswerKey =
  | 'diabetes'
  | 'previousFootInjury'
  | 'currentPain'
  | 'numbness'
  | 'currentWound'
  | 'unusualFootwear';

export type RiskAnswers = Readonly<Record<AnswerKey, boolean>>;

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

export type RiskLevel = 'low' | 'moderate' | 'high';
export type ZoneState = 'normal' | 'elevated' | 'high';
export type FlagReason = 'highLoad' | 'asymmetry';

export interface ZoneFlag {
  readonly foot: Foot;
  readonly zone: Zone;
  readonly reason: FlagReason;
}

export type RecommendationKey = 'seeMedical' | 'offload' | 'footwear' | 'dailyCheck' | 'rest' | 'hotGround';

export interface RiskResult {
  readonly level: RiskLevel;
  readonly refer: boolean;
  readonly zoneFlags: readonly ZoneFlag[];
  readonly recommendations: readonly RecommendationKey[];
  readonly firedRules: readonly string[];
}

export type ScenarioName = 'low' | 'moderate' | 'high';
export type Language = 'ar' | 'en';
/** `result` is what the pilgrim sees; `doctor` is the clinician's summary of the same screening. */
export type ScreenName = 'start' | 'questions' | 'scan' | 'result' | 'doctor' | 'volunteer';

export const SCREENS: readonly ScreenName[] = ['start', 'questions', 'scan', 'result', 'doctor', 'volunteer'];

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
export const SCENARIO_NAMES: readonly ScenarioName[] = ['low', 'moderate', 'high'];

export const isScreenName = (value: unknown): value is ScreenName =>
  typeof value === 'string' && (SCREENS as readonly string[]).includes(value);
export const isScenarioName = (value: unknown): value is ScenarioName =>
  typeof value === 'string' && (SCENARIO_NAMES as readonly string[]).includes(value);
export const isLanguage = (value: unknown): value is Language => value === 'ar' || value === 'en';
export const isSensorMode = (value: unknown): value is SensorMode =>
  typeof value === 'string' && (SENSOR_MODES as readonly string[]).includes(value);
export const isCalibrationStep = (value: unknown): value is CalibrationStep => value === 'zero' || value === 'reference';
