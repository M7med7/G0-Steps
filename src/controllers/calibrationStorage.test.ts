import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CALIBRATION } from '../models/pressureProtocol';
import { browserCalibrationStorage } from './calibrationStorage';

/** A minimal in-memory Storage. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('browserCalibrationStorage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves and loads a calibration', () => {
    const storage = memoryStorage();
    const calibrations = browserCalibrationStorage(() => storage);
    const calibration = { ...DEFAULT_CALIBRATION, zero: DEFAULT_CALIBRATION.zero.map(() => 120), zeroedAt: '2026-10-09T08:00:00.000Z' };
    calibrations.save(calibration);
    expect(calibrations.load()).toEqual(calibration);
  });

  it('returns null when nothing is stored', () => {
    expect(browserCalibrationStorage(() => memoryStorage()).load()).toBeNull();
  });

  it('ignores stored data that is not a calibration', () => {
    const storage = memoryStorage({ 'footguard.calibration.v1': '{"zero":[1,2]}' });
    expect(browserCalibrationStorage(() => storage).load()).toBeNull();
  });

  it('warns instead of crashing when storage is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const calibrations = browserCalibrationStorage(() => {
      throw new Error('blocked');
    });
    expect(calibrations.load()).toBeNull();
    calibrations.save(DEFAULT_CALIBRATION);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
