import type { SensorReadings } from '../models/types';

/**
 * The only way the app gets sensor data. Screens never talk to hardware directly.
 * SimulatedSource ships first; an Esp32Source (pressure over WebSocket or Web Serial) replaces it later.
 */
export interface SensorSource {
  read(): Promise<SensorReadings>;
}
