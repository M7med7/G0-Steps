import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../models/scenarios';
import { SimulatedSource } from './SimulatedSource';

describe('SimulatedSource', () => {
  const fixedClock = () => new Date('2026-10-06T07:12:00.000Z');

  it('returns the scenario pressure, labeled as simulated', async () => {
    const readings = await new SimulatedSource('moderate', fixedClock).read();
    expect(readings.source).toBe('simulated');
    expect(readings.pressure).toEqual(SCENARIOS.moderate.pressure);
    expect(readings.thermal).toBeNull();
    expect(readings.rgb).toBeNull();
    expect(readings.capturedAt).toBe('2026-10-06T07:12:00.000Z');
  });

  it('is deterministic across reads', async () => {
    const source = new SimulatedSource('high', fixedClock);
    expect(await source.read()).toEqual(await source.read());
  });
});
