import { describe, expect, it } from 'vitest';
import { assessRisk } from '../../models/riskAssessment';
import { SCENARIOS, scenarioAnswers } from '../../models/scenarios';
import { createInitialState, type AppState } from '../../models/ScreeningStore';
import { createViewContext } from '../context';
import { renderDoctor } from './doctorView';

function stateFor(scenario: 'low' | 'high', patch: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(scenario),
    screen: 'doctor',
    language: 'en',
    answers: scenarioAnswers(scenario),
    readings: { source: 'simulated', pressure: SCENARIOS[scenario].pressure, thermal: null, rgb: null, capturedAt: '2026-10-09T08:00:00.000Z' },
    scanProgress: 8,
    ...patch,
  };
}

describe('renderDoctor', () => {
  it('explains a high result: level, referral and the rules that fired', () => {
    const state = stateFor('high');
    const html = renderDoctor(createViewContext(state), assessRisk(state.answers, SCENARIOS.high.pressure));
    expect(html).toContain('High risk');
    expect(html).toContain('Refer to the medical point');
    expect(html).toContain('Diabetes with numbness');
    expect(html).toContain('illustrative');
  });

  it('shows every zone as a share of load, never kPa', () => {
    const state = stateFor('high');
    const html = renderDoctor(createViewContext(state), assessRisk(state.answers, SCENARIOS.high.pressure));
    expect(html).toContain('91%');
    expect(html).toContain('not a pressure measurement in kPa');
    expect(html).not.toMatch(/\d\s*kPa/);
  });

  it('says it is screening support, not a diagnosis', () => {
    const state = stateFor('low');
    const html = renderDoctor(createViewContext(state), assessRisk(state.answers, SCENARIOS.low.pressure));
    expect(html).toContain('not a diagnosis');
    expect(html).toContain('No referral needed');
  });

  it('names the data source and marks thermal and camera as not connected', () => {
    const preset = renderDoctor(createViewContext(stateFor('low')), assessRisk(scenarioAnswers('low'), SCENARIOS.low.pressure));
    expect(preset).toContain('Preset scenario · simulated');
    expect(preset.match(/Not connected in prototype/g)).toHaveLength(2);

    const live = stateFor('low', {
      sensorMode: 'esp32',
      readings: { source: 'esp32', pressure: SCENARIOS.low.pressure, thermal: null, rgb: null, capturedAt: '2026-10-09T08:00:00.000Z' },
    });
    expect(renderDoctor(createViewContext(live), assessRisk(live.answers, SCENARIOS.low.pressure))).toContain('ESP32 platform · live reading');
  });
});
