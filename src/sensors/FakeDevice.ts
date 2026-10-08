import { ADC_MAX, formatFrame, SENSOR_ORDER } from '../models/pressureProtocol';
import type { PressureMap } from '../models/types';
import { LineDevice } from './PressureDevice';

/** The firmware sends a frame every 50 ms; the fake matches it. */
export const FRAME_INTERVAL_MS = 50;
/** How long the fake pilgrim takes to settle onto the platform after connecting. */
const STEP_ON_MS = 1500;
/** Random noise, in ADC counts, added to every fake reading, like a real FSR divider. */
const NOISE_COUNTS = 35;

/**
 * Pretends to be the ESP32 so the whole pipeline can be tried without hardware.
 * It prints the same text lines the firmware does and feeds them through the same parser.
 * It encodes load with the default calibration (0 to the full ADC range), so the app reads it back with that too.
 */
export class FakeDevice extends LineDevice {
  readonly simulated = true;
  private timer: ReturnType<typeof setInterval> | null = null;
  private connectedAt = 0;

  constructor(
    /** The load the fake pilgrim puts on each zone; read on every frame, so it can change while connected. */
    private readonly target: () => PressureMap,
    private readonly random: () => number = Math.random,
    private readonly now: () => number = () => Date.now(),
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.timer !== null) return;
    this.connectedAt = this.now();
    this.timer = setInterval(() => this.emit(), FRAME_INTERVAL_MS);
  }

  async disconnect(): Promise<void> {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private emit(): void {
    const settle = Math.min(1, (this.now() - this.connectedAt) / STEP_ON_MS);
    const pressure = this.target();
    const raw = SENSOR_ORDER.map(([foot, zone]) => {
      const noise = (this.random() - 0.5) * 2 * NOISE_COUNTS;
      return Math.round(Math.min(ADC_MAX, Math.max(0, pressure[foot][zone] * settle * ADC_MAX + noise)));
    });
    this.receive(`${formatFrame(raw)}\n`);
  }
}
