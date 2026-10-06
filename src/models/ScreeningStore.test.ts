import { describe, expect, it, vi } from 'vitest';
import { QUESTION_COUNT } from './questions';
import { SCENARIOS } from './scenarios';
import { createInitialState, ScreeningStore, selectResult, SENSOR_COUNT } from './ScreeningStore';
import type { SensorReadings } from './types';

const readings = (scenario: keyof typeof SCENARIOS): SensorReadings => ({
  source: 'simulated',
  pressure: SCENARIOS[scenario].pressure,
  thermal: null,
  rgb: null,
  capturedAt: '2026-10-06T07:00:00.000Z',
});

describe('ScreeningStore', () => {
  it('replaces the state object on every update instead of mutating it', () => {
    const store = new ScreeningStore();
    const before = store.getState();
    store.setLanguage('en');
    expect(store.getState()).not.toBe(before);
    expect(before.language).toBe('ar');
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const store = new ScreeningStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setLanguage('en');
    unsubscribe();
    store.setLanguage('ar');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('walks through all questions, then opens the scan', () => {
    const store = new ScreeningStore(createInitialState('low'));
    store.beginScreening('en');
    for (let i = 0; i < QUESTION_COUNT; i += 1) store.answerCurrent(i === 0);
    const state = store.getState();
    expect(state.screen).toBe('scan');
    expect(state.answers.diabetes).toBe(true);
    expect(state.answers.unusualFootwear).toBe(false);
    expect(Object.keys(state.answered)).toHaveLength(QUESTION_COUNT);
  });

  it('goes back to the start screen from the first question', () => {
    const store = new ScreeningStore();
    store.beginScreening('ar');
    store.previousQuestion();
    expect(store.getState().screen).toBe('start');
  });

  it('only produces a result once all sensors have been read', () => {
    const store = new ScreeningStore(createInitialState('high'));
    store.setReadings(readings('high'));
    expect(selectResult(store.getState())).toBeNull();
    store.setScanProgress(SENSOR_COUNT);
    expect(selectResult(store.getState())?.level).toBe('high');
  });

  it('clamps scan progress to the sensor count', () => {
    const store = new ScreeningStore();
    store.setScanProgress(SENSOR_COUNT + 5);
    expect(store.getState().scanProgress).toBe(SENSOR_COUNT);
  });

  it('discards a finished scan when the scenario changes', () => {
    const store = new ScreeningStore(createInitialState('low'));
    store.setReadings(readings('low'));
    store.setScanProgress(SENSOR_COUNT);
    store.setScenario('high');
    const state = store.getState();
    expect(state.readings).toBeNull();
    expect(state.answers.diabetes).toBe(true);
    expect(selectResult(state)).toBeNull();
  });

  it('starts a fresh scan when navigating to the scan screen', () => {
    const store = new ScreeningStore();
    store.setReadings(readings('moderate'));
    store.setSensorError();
    store.goTo('scan');
    const state = store.getState();
    expect(state.readings).toBeNull();
    expect(state.sensorError).toBe(false);
    expect(state.scanProgress).toBe(0);
  });
});
