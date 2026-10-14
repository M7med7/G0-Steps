import type {
  ActionCategory,
  FlagReason,
  FollowUpKey,
  QuestionKey,
  RecommendationKey,
  SensorErrorReason,
  Side,
  Zone,
} from '../../models/types';

export interface QuestionStrings {
  readonly question: string;
  /** A few words for the answer list and the clinical report. */
  readonly short: string;
  readonly why: string;
}

export interface FollowUpStrings {
  readonly question: string;
  readonly short: string;
}

/**
 * Everything a pilgrim can read, in one language. Every locale file must fill every key, so the type checker
 * catches a missing translation. Staff-only text (exam, clinical report, volunteer list) stays in copy.ts in
 * Arabic and English.
 */
export interface LocaleStrings {
  readonly brandSub: string;
  readonly steps: { readonly identify: string; readonly exam: string; readonly questions: string; readonly scan: string; readonly result: string };

  readonly yes: string;
  readonly no: string;
  readonly unsure: string;
  /** Side buttons: "Right foot", "Left foot", "Both feet". */
  readonly sides: Readonly<Record<Side, string>>;
  readonly leftShort: string;
  readonly rightShort: string;
  readonly back: string;
  readonly next: string;
  readonly whichFoot: string;
  readonly whyWeAsk: string;
  readonly yourAnswers: string;
  /** Placeholders: {n}, {total}. */
  readonly questionCount: string;

  readonly handoverTitle: string;
  readonly handoverLede: string;
  readonly chooseLanguage: string;
  readonly startQuestions: string;

  readonly questions: Readonly<Record<QuestionKey, QuestionStrings>>;
  readonly followUps: Readonly<Record<FollowUpKey, FollowUpStrings>>;

  readonly scanTitle: string;
  readonly scanLede: string;
  /** Placeholders: {k}, {total}. */
  readonly scanReading: string;
  readonly scanRecording: string;
  readonly scanComplete: string;
  readonly sensorPressure: string;
  readonly sensorThermal: string;
  readonly sensorCamera: string;
  readonly notConnected: string;
  readonly showResult: string;
  readonly skipWait: string;
  readonly retry: string;
  readonly sensorErrors: Readonly<Record<SensorErrorReason, string>>;

  readonly categories: Readonly<Record<ActionCategory, { readonly title: string; readonly summary: string }>>;
  readonly recommendations: Readonly<Record<RecommendationKey, string>>;
  readonly referral: string;
  readonly urgentAlert: string;
  readonly qrNote: string;
  readonly qrLabel: string;
  readonly provisional: string;
  readonly markedAreas: string;
  readonly noMarkedAreas: string;
  readonly notMeasured: string;
  readonly footMapLabel: string;
  readonly legendNormal: string;
  readonly legendRaised: string;
  readonly legendHigh: string;
  readonly zones: Readonly<Record<Zone, string>>;
  readonly flagReasons: Readonly<Record<FlagReason, string>>;
  readonly nextPilgrim: string;
  readonly volunteerList: string;
  readonly pilgrimView: string;
  readonly reportView: string;
  readonly resultViews: string;
  readonly station3d: string;
}
