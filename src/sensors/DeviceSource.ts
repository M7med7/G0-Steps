import { averageFrames, hasFeetOnPlatform, toPressureMap, type Calibration, type RawFrame } from '../models/pressureProtocol';
import type { SensorReadings } from '../models/types';
import type { PressureDevice } from './PressureDevice';
import { SensorReadError, type SensorSource } from './SensorSource';

/** How long the pilgrim stands still while frames are collected and averaged. */
export const CAPTURE_MS = 4000;
/** Fewer frames than this in one capture means the board stopped sending (it sends about 80). */
const MIN_FRAMES = 10;

export interface DeviceSourceOptions {
  readonly captureMs?: number;
  readonly now?: () => Date;
  readonly wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** One scan from a streaming device: collect frames for a few seconds, average them, apply calibration. */
export class DeviceSource implements SensorSource {
  constructor(
    private readonly device: PressureDevice,
    private readonly calibration: Calibration,
    private readonly options: DeviceSourceOptions = {},
  ) {}

  async read(): Promise<SensorReadings> {
    const frames: RawFrame[] = [];
    const stop = this.device.onFrame((frame) => frames.push(frame));
    try {
      await (this.options.wait ?? sleep)(this.options.captureMs ?? CAPTURE_MS);
    } finally {
      stop();
    }
    if (frames.length < MIN_FRAMES) throw new SensorReadError('noData');
    const pressure = toPressureMap(averageFrames(frames), this.calibration);
    if (!hasFeetOnPlatform(pressure)) throw new SensorReadError('noFeet');
    return {
      source: this.device.simulated ? 'simulated' : 'esp32',
      pressure,
      thermal: null,
      rgb: null,
      capturedAt: (this.options.now ?? (() => new Date()))().toISOString(),
    };
  }
}
