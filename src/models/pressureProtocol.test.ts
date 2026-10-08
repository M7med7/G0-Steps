import { describe, expect, it } from 'vitest';
import {
  ADC_MAX,
  averageFrames,
  DEFAULT_CALIBRATION,
  formatFrame,
  hasFeetOnPlatform,
  isCalibration,
  MIN_REFERENCE_SPAN,
  parseFrame,
  peakFrame,
  SENSOR_ORDER,
  toPressureMap,
  totalLoad,
  withReference,
  withZero,
  type Calibration,
} from './pressureProtocol';

const frame = (...values: number[]): number[] => values;
const flat = (value: number): number[] => SENSOR_ORDER.map(() => value);

describe('parseFrame', () => {
  it('reads a firmware line into 8 values in sensor order', () => {
    expect(parseFrame('{"raw":[0,1,2,3,4,5,6,4095]}')).toEqual([0, 1, 2, 3, 4, 5, 6, 4095]);
  });

  it('round-trips the line format the fake device prints', () => {
    const raw = frame(10, 20, 30, 40, 50, 60, 70, 80);
    expect(parseFrame(formatFrame(raw))).toEqual(raw);
  });

  it('skips boot messages, cut-off lines and out-of-range values', () => {
    expect(parseFrame('{"hello":"footguard","fw":"0.1.0"}')).toBeNull();
    expect(parseFrame('{"raw":[1,2,3')).toBeNull();
    expect(parseFrame('{"raw":[1,2,3,4,5,6,7]}')).toBeNull();
    expect(parseFrame('{"raw":[1,2,3,4,5,6,7,4096]}')).toBeNull();
    expect(parseFrame('{"raw":[1,2,3,4,5,6,7,-1]}')).toBeNull();
    expect(parseFrame('{"raw":[1,2,3,4,5,6,7,1.5]}')).toBeNull();
    expect(parseFrame('null')).toBeNull();
    expect(parseFrame('')).toBeNull();
  });
});

describe('toPressureMap', () => {
  it('maps sensor order onto feet and zones', () => {
    const map = toPressureMap(frame(ADC_MAX, 0, 0, 0, 0, 0, 0, ADC_MAX), DEFAULT_CALIBRATION);
    expect(map.L.hallux).toBe(1);
    expect(map.R.heel).toBe(1);
    expect(map.L.heel).toBe(0);
  });

  it('measures load between each sensor’s zero and reference, clamped to 0–1', () => {
    const calibration: Calibration = { ...DEFAULT_CALIBRATION, zero: flat(100), reference: flat(1100) };
    const map = toPressureMap(frame(600, 100, 50, 1100, 2000, 350, 100, 100), calibration);
    expect(map.L.hallux).toBeCloseTo(0.5);
    expect(map.L.medialForefoot).toBe(0);
    expect(map.L.lateralForefoot).toBe(0);
    expect(map.L.heel).toBe(1);
    expect(map.R.hallux).toBe(1);
    expect(map.R.medialForefoot).toBeCloseTo(0.25);
  });

  it('treats a sensor with no span as unloaded instead of dividing by zero', () => {
    const calibration: Calibration = { ...DEFAULT_CALIBRATION, zero: flat(500), reference: flat(500) };
    expect(totalLoad(toPressureMap(flat(900), calibration))).toBe(0);
  });
});

describe('averaging and peaks', () => {
  it('averages each sensor across frames', () => {
    expect(averageFrames([flat(100), flat(300)])).toEqual(flat(200));
  });

  it('keeps each sensor’s highest value', () => {
    expect(peakFrame([frame(1, 9, 1, 1, 1, 1, 1, 1), frame(5, 2, 1, 1, 1, 1, 1, 7)])).toEqual([5, 9, 1, 1, 1, 1, 1, 7]);
  });

  it('refuses an empty capture', () => {
    expect(() => averageFrames([])).toThrow();
    expect(() => peakFrame([])).toThrow();
  });
});

describe('calibration', () => {
  it('records the empty-platform average as zero', () => {
    const calibrated = withZero(DEFAULT_CALIBRATION, [flat(90), flat(110)], '2026-10-09T08:00:00.000Z');
    expect(calibrated.zero).toEqual(flat(100));
    expect(calibrated.zeroedAt).toBe('2026-10-09T08:00:00.000Z');
    expect(calibrated.reference).toEqual(DEFAULT_CALIBRATION.reference);
  });

  it('keeps each sensor’s peak press as its reference', () => {
    const zeroed: Calibration = { ...DEFAULT_CALIBRATION, zero: flat(100) };
    const presses = SENSOR_ORDER.map((_, i) => SENSOR_ORDER.map((__, j) => (i === j ? 2000 + i : 100)));
    const { calibration, weak } = withReference(zeroed, presses, '2026-10-09T08:01:00.000Z');
    expect(weak).toEqual([]);
    expect(calibration.reference).toEqual(SENSOR_ORDER.map((_, i) => 2000 + i));
    expect(calibration.referencedAt).toBe('2026-10-09T08:01:00.000Z');
  });

  it('reports sensors that never rose, and keeps their previous reference', () => {
    const zeroed: Calibration = { ...DEFAULT_CALIBRATION, zero: flat(100) };
    const presses = [frame(2000, 100 + MIN_REFERENCE_SPAN - 1, 2000, 2000, 2000, 2000, 2000, 100)];
    const { calibration, weak } = withReference(zeroed, presses, '2026-10-09T08:01:00.000Z');
    expect(weak).toEqual([1, 7]);
    expect(calibration.reference[1]).toBe(ADC_MAX);
    expect(calibration.reference[0]).toBe(2000);
  });

  it('validates stored calibrations', () => {
    expect(isCalibration(DEFAULT_CALIBRATION)).toBe(true);
    expect(isCalibration({ ...DEFAULT_CALIBRATION, zero: [1, 2] })).toBe(false);
    expect(isCalibration({ ...DEFAULT_CALIBRATION, zeroedAt: 5 })).toBe(false);
    expect(isCalibration('nope')).toBe(false);
    expect(isCalibration(null)).toBe(false);
  });
});

describe('hasFeetOnPlatform', () => {
  it('needs real load across the sensors, not just noise', () => {
    expect(hasFeetOnPlatform(toPressureMap(flat(40), DEFAULT_CALIBRATION))).toBe(false);
    expect(hasFeetOnPlatform(toPressureMap(flat(1500), DEFAULT_CALIBRATION))).toBe(true);
  });
});
