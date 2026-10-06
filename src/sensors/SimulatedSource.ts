import { SCENARIOS } from '../models/scenarios';
import type { ScenarioName, SensorReadings } from '../models/types';
import type { SensorSource } from './SensorSource';

/** Deterministic readings from a preset scenario, so demos and tests repeat exactly. */
export class SimulatedSource implements SensorSource {
  constructor(
    private readonly scenario: ScenarioName,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async read(): Promise<SensorReadings> {
    return {
      source: 'simulated',
      pressure: SCENARIOS[this.scenario].pressure,
      thermal: null,
      rgb: null,
      capturedAt: this.now().toISOString(),
    };
  }
}
