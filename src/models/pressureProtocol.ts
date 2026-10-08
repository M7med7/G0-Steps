/*
 * The ESP32's serial protocol and the calibration that turns its raw readings into relative load.
 * The firmware (firmware/footguard-esp32) prints one JSON line per frame: {"raw":[8 ADC values, 0–4095]}.
 * Load is relative to each sensor's own reference press, never kPa: FSR402s are not calibrated pressure sensors.
 */
import type { Foot, PressureMap, Zone } from './types';

/** Highest value of the ESP32-S3's 12-bit ADC. */
export const ADC_MAX = 4095;

/** The order the firmware sends the 8 sensors in. It must match SENSOR_PINS in the firmware. */
export const SENSOR_ORDER: readonly (readonly [Foot, Zone])[] = [
  ['L', 'hallux'],
  ['L', 'medialForefoot'],
  ['L', 'lateralForefoot'],
  ['L', 'heel'],
  ['R', 'hallux'],
  ['R', 'medialForefoot'],
  ['R', 'lateralForefoot'],
  ['R', 'heel'],
];

/** One reading of all 8 sensors, in SENSOR_ORDER. */
export type RawFrame = readonly number[];

export interface Calibration {
  /** Each sensor's reading with nobody on the platform. */
  readonly zero: readonly number[];
  /** Each sensor's reading under the reference press, which counts as full load (1.0). */
  readonly reference: readonly number[];
  readonly zeroedAt: string | null;
  readonly referencedAt: string | null;
}

/** Uncalibrated: the full ADC range is treated as 0–1. The fake device also encodes with this. */
export const DEFAULT_CALIBRATION: Calibration = {
  zero: SENSOR_ORDER.map(() => 0),
  reference: SENSOR_ORDER.map(() => ADC_MAX),
  zeroedAt: null,
  referencedAt: null,
};

/** During the reference press a sensor must rise at least this far above its zero, or it counts as not responding. */
export const MIN_REFERENCE_SPAN = 300;
/** Summed relative load over all 8 sensors below which nobody is standing on the platform. */
export const MIN_STANDING_LOAD = 0.5;

const isAdcValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= ADC_MAX;

const isSensorArray = (value: unknown): value is readonly number[] =>
  Array.isArray(value) && value.length === SENSOR_ORDER.length && value.every((v) => typeof v === 'number' && Number.isFinite(v));

/** Reads one firmware line. Boot messages, partial or garbled lines return null and are skipped. */
export function parseFrame(line: string): RawFrame | null {
  let data: unknown;
  try {
    data = JSON.parse(line);
  } catch {
    // Serial lines can arrive cut in half when the board resets; those are expected and skipped.
    return null;
  }
  if (typeof data !== 'object' || data === null || !('raw' in data)) return null;
  const raw: unknown = data.raw;
  if (!Array.isArray(raw) || raw.length !== SENSOR_ORDER.length || !raw.every(isAdcValue)) return null;
  return raw;
}

/** The exact line format the firmware prints. The fake device uses it so it goes through the same parser. */
export function formatFrame(raw: RawFrame): string {
  return JSON.stringify({ raw });
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export function toPressureMap(raw: RawFrame, calibration: Calibration): PressureMap {
  const load = (i: number): number => {
    const zero = calibration.zero[i] ?? 0;
    const span = (calibration.reference[i] ?? ADC_MAX) - zero;
    return span > 0 ? clamp01(((raw[i] ?? 0) - zero) / span) : 0;
  };
  const byZone = (foot: Foot): Readonly<Record<Zone, number>> => {
    const index = (zone: Zone): number => SENSOR_ORDER.findIndex(([f, z]) => f === foot && z === zone);
    return {
      hallux: load(index('hallux')),
      medialForefoot: load(index('medialForefoot')),
      lateralForefoot: load(index('lateralForefoot')),
      heel: load(index('heel')),
    };
  };
  return { L: byZone('L'), R: byZone('R') };
}

/** Per-sensor mean of a capture, which smooths out noise while the pilgrim stands still. */
export function averageFrames(frames: readonly RawFrame[]): RawFrame {
  if (frames.length === 0) throw new Error('averageFrames needs at least one frame');
  return SENSOR_ORDER.map((_, i) => Math.round(frames.reduce((sum, frame) => sum + (frame[i] ?? 0), 0) / frames.length));
}

/** Per-sensor highest value of a capture. */
export function peakFrame(frames: readonly RawFrame[]): RawFrame {
  if (frames.length === 0) throw new Error('peakFrame needs at least one frame');
  return SENSOR_ORDER.map((_, i) => Math.max(...frames.map((frame) => frame[i] ?? 0)));
}

/** Zero step: the average reading with nobody on the platform. */
export function withZero(calibration: Calibration, frames: readonly RawFrame[], at: string): Calibration {
  return { ...calibration, zero: averageFrames(frames), zeroedAt: at };
}

export interface ReferenceResult {
  readonly calibration: Calibration;
  /** Sensors, by index in SENSOR_ORDER, that barely rose above zero. They keep their previous reference. */
  readonly weak: readonly number[];
}

/** Reference step: the operator presses each sensor in turn with the same reference weight; each sensor keeps its peak. */
export function withReference(calibration: Calibration, frames: readonly RawFrame[], at: string): ReferenceResult {
  const peak = peakFrame(frames);
  const weak = SENSOR_ORDER.map((_, i) => i).filter((i) => (peak[i] ?? 0) - (calibration.zero[i] ?? 0) < MIN_REFERENCE_SPAN);
  const reference = SENSOR_ORDER.map((_, i) => (weak.includes(i) ? (calibration.reference[i] ?? ADC_MAX) : (peak[i] ?? ADC_MAX)));
  return { calibration: { ...calibration, reference, referencedAt: at }, weak };
}

export function totalLoad(pressure: PressureMap): number {
  return SENSOR_ORDER.reduce((sum, [foot, zone]) => sum + pressure[foot][zone], 0);
}

export const hasFeetOnPlatform = (pressure: PressureMap): boolean => totalLoad(pressure) >= MIN_STANDING_LOAD;

/** Validates a calibration read back from storage, which may be stale or edited by hand. */
export function isCalibration(value: unknown): value is Calibration {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  const isTime = (t: unknown): boolean => t === null || typeof t === 'string';
  return isSensorArray(c['zero']) && isSensorArray(c['reference']) && isTime(c['zeroedAt']) && isTime(c['referencedAt']);
}
