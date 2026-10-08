import { isCalibration, type Calibration } from '../models/pressureProtocol';

const STORAGE_KEY = 'footguard.calibration.v1';

export interface CalibrationStorage {
  load(): Calibration | null;
  save(calibration: Calibration): void;
}

/**
 * Keeps the ESP32 calibration in this browser so it survives a reload.
 * It holds sensor numbers only, never anything about a person.
 */
export function browserCalibrationStorage(getStorage: () => Storage): CalibrationStorage {
  return {
    load() {
      try {
        const stored = getStorage().getItem(STORAGE_KEY);
        if (!stored) return null;
        const parsed: unknown = JSON.parse(stored);
        return isCalibration(parsed) ? parsed : null;
      } catch (error) {
        console.warn('Stored calibration could not be read; using the default.', error);
        return null;
      }
    },
    save(calibration) {
      try {
        getStorage().setItem(STORAGE_KEY, JSON.stringify(calibration));
      } catch (error) {
        console.warn('Calibration could not be saved in this browser; it will reset on reload.', error);
      }
    },
  };
}
