import { describe, expect, it } from 'vitest';
import { SAMPLE_CARDS } from '../../models/pilgrimCards';
import { assessScreening } from '../../models/riskAssessment';
import { SCENARIOS, scenarioAnswers, scenarioExam } from '../../models/scenarios';
import { createInitialState, type AppState } from '../../models/ScreeningStore';
import type { ScenarioName } from '../../models/types';
import { createViewContext } from '../context';
import { renderDoctor } from './doctorView';

function stateFor(scenario: ScenarioName, patch: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(scenario),
    screen: 'doctor',
    language: 'en',
    answers: scenarioAnswers(scenario),
    exam: scenarioExam(scenario),
    readings: { source: 'simulated', pressure: SCENARIOS[scenario].pressure, thermal: null, rgb: null, capturedAt: '2026-10-09T08:00:00.000Z' },
    scanProgress: 8,
    ...patch,
  };
}

const render = (state: AppState): string =>
  renderDoctor(createViewContext(state), assessScreening(state.answers, state.exam, state.readings?.pressure ?? null));

describe('renderDoctor', () => {
  it('explains a high result: category, the action required and the rules that fired with their sources', () => {
    const html = render(stateFor('high'));
    expect(html).toContain('High concern: priority clinical review');
    expect(html).toContain('Prompt clinician assessment');
    expect(html).toContain('Loss of protective sensation');
    expect(html).toContain('IWGDF prevention guideline (2023)');
  });

  it('lists positive exam findings with the side, and leaves out the "no" ones', () => {
    const html = render(stateFor('high'));
    expect(html).toContain('Blister');
    expect(html).toContain('Yes · Right foot');
    expect(html).not.toContain('Sudden cold or pale foot');
  });

  it('shows every zone as a share of load, never kPa', () => {
    const html = render(stateFor('high'));
    expect(html).toContain('91%');
    expect(html).toContain('not a pressure measurement in kPa');
    expect(html).not.toMatch(/\d\s*kPa/);
  });

  it('says it is screening support with proposed categories, not a diagnosis', () => {
    const html = render(stateFor('low'));
    expect(html).toContain('not a diagnosis');
    expect(html).toContain('prospective validation');
  });

  it('says testing stopped for an urgent case with no scan', () => {
    const html = render(stateFor('urgent', { readings: null, scanProgress: 0 }));
    expect(html).toContain('Urgent override');
    expect(html).toContain('Device testing stopped for an urgent finding');
    expect(html).toContain('No pressure reading');
  });

  it('shows the pilgrim language, flags a draft translation, and shows the card as a sample record', () => {
    const html = render(stateFor('low', { locale: 'ur', profile: SAMPLE_CARDS[1] ?? null }));
    expect(html).toContain('Answered in اردو');
    expect(html).toContain('Draft translation');
    expect(html).toContain('Muhammad Bilal');
    expect(html).toContain('Sample record');
  });

  it('escapes the pilgrim name', () => {
    const card = { cardId: 'X', name: '<img src=x onerror=alert(1)>', age: 50, sex: 'male' as const, nationality: 'PK' };
    const html = render(stateFor('low', { profile: card }));
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('names the data source and marks thermal and camera as not connected', () => {
    expect(render(stateFor('low'))).toContain('Preset scenario · simulated');
    expect(render(stateFor('low')).match(/Not connected in prototype/g)).toHaveLength(2);
    const live = stateFor('low', {
      sensorMode: 'esp32',
      readings: { source: 'esp32', pressure: SCENARIOS.low.pressure, thermal: null, rgb: null, capturedAt: '2026-10-09T08:00:00.000Z' },
    });
    expect(render(live)).toContain('ESP32 platform · live reading');
  });
});
