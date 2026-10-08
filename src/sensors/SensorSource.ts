import type { SensorErrorReason, SensorReadings } from '../models/types';

/**
 * The only way the app gets sensor data. Screens never talk to hardware directly.
 * SimulatedSource returns preset scenarios; DeviceSource captures from the ESP32 or the fake device.
 */
export interface SensorSource {
  read(): Promise<SensorReadings>;
}

/** A read that failed for a known reason, so the scan screen can say what to do about it. */
export class SensorReadError extends Error {
  constructor(readonly reason: SensorErrorReason) {
    super(`Sensor read failed: ${reason}`);
    this.name = 'SensorReadError';
  }
}
