import { describe, expect, it, vi } from 'vitest';
import { lookUpCard, SAMPLE_CARDS, suggestedLocale } from './pilgrimCards';
import { DEFAULT_CALIBRATION } from './pressureProtocol';
import { EXAM_KEYS, QUESTION_COUNT, QUESTIONS } from './questions';
import { SCENARIOS } from './scenarios';
import {
  createInitialState,
  isTestingStopped,
  ScreeningStore,
  selectResult,
  SENSOR_COUNT,
  showsSimulatedData,
  usesDevice,
} from './ScreeningStore';
import type { SensorReadings } from './types';

const readings = (scenario: keyof typeof SCENARIOS): SensorReadings => ({
  source: 'simulated',
  pressure: SCENARIOS[scenario].pressure,
  thermal: null,
  rgb: null,
  capturedAt: '2026-10-06T07:00:00.000Z',
});

/** Store with a finished, all-clear exam, on the questions screen. */
function atQuestions(): ScreeningStore {
  const store = new ScreeningStore(createInitialState('low'));
  store.identify(null);
  EXAM_KEYS.forEach((key) => store.setExamAnswer(key, 'no'));
  store.finishExam();
  store.goTo('questions');
  return store;
}

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

  describe('step 1: the card', () => {
    it('opens the exam and switches the pilgrim screens to the card nationality language', () => {
      const store = new ScreeningStore();
      const card = SAMPLE_CARDS.find((c) => c.nationality === 'ID');
      if (!card) throw new Error('missing sample');
      store.identify(card);
      const state = store.getState();
      expect(state.screen).toBe('exam');
      expect(state.profile).toBe(card);
      expect(state.locale).toBe('id');
      expect(state.language).toBe('ar');
    });

    it('continues without a card and keeps the language', () => {
      const store = new ScreeningStore();
      store.setLocale('tr');
      store.identify(null);
      expect(store.getState().profile).toBeNull();
      expect(store.getState().locale).toBe('tr');
    });

    it('labels a scanned sample card as simulated data, even with the real board', () => {
      const store = new ScreeningStore();
      store.setSensorMode('esp32');
      expect(showsSimulatedData(store.getState())).toBe(false);
      store.identify(SAMPLE_CARDS[0] ?? null);
      store.goTo('identify');
      expect(showsSimulatedData(store.getState())).toBe(true);
    });

    it('clears everything about the last pilgrim for the next one', () => {
      const store = atQuestions();
      store.identify(SAMPLE_CARDS[1] ?? null);
      store.setReadings(readings('low'));
      store.newScreening();
      const state = store.getState();
      expect(state.screen).toBe('identify');
      expect(state.profile).toBeNull();
      expect(state.readings).toBeNull();
      expect(EXAM_KEYS.every((key) => state.exam[key].answer === null)).toBe(true);
      expect(QUESTIONS.every((q) => state.answers[q.key].answer === null)).toBe(true);
    });
  });

  describe('card lookup', () => {
    it('finds a sample card whatever the case or surrounding spaces', () => {
      const lookup = lookUpCard('  fg-sample-002 \n');
      expect(lookup.ok && lookup.profile.nationality).toBe('PK');
    });

    it('rejects an empty or unknown code, and anything too long', () => {
      expect(lookUpCard('   ')).toEqual({ ok: false, reason: 'empty' });
      expect(lookUpCard('P1234567')).toEqual({ ok: false, reason: 'unknown' });
      expect(lookUpCard('FG-SAMPLE-001'.repeat(10))).toEqual({ ok: false, reason: 'unknown' });
    });

    it('suggests a language for every sample card', () => {
      expect(SAMPLE_CARDS.map(suggestedLocale)).toEqual(['id', 'ur', 'bn', 'tr', 'ha', 'ar', 'ar']);
    });
  });

  describe('step 2: the exam', () => {
    it('keeps a side only after a yes, and drops it when the answer changes', () => {
      const store = new ScreeningStore();
      store.setExamSide('blister', 'L');
      expect(store.getState().exam.blister.side).toBeNull();
      store.setExamAnswer('blister', 'yes');
      store.setExamSide('blister', 'L');
      expect(store.getState().exam.blister).toEqual({ answer: 'yes', side: 'L' });
      store.setExamAnswer('blister', 'unsure');
      expect(store.getState().exam.blister).toEqual({ answer: 'unsure', side: null });
    });

    it('hands over to the pilgrim, or skips straight to the report on an urgent finding', () => {
      const routine = new ScreeningStore();
      routine.finishExam();
      expect(routine.getState().screen).toBe('handover');

      const urgent = new ScreeningStore();
      urgent.setExamAnswer('coldPaleFoot', 'yes');
      urgent.finishExam();
      expect(urgent.getState().screen).toBe('result');
      expect(isTestingStopped(urgent.getState())).toBe(true);
      expect(selectResult(urgent.getState())?.category).toBe('urgent');
    });
  });

  describe('step 3: the questions', () => {
    it('walks through all questions with "no", then opens the scan', () => {
      const store = atQuestions();
      for (let i = 0; i < QUESTION_COUNT; i += 1) store.answerQuestion('no');
      expect(store.getState().screen).toBe('scan');
    });

    it('moves on at once after "unsure"', () => {
      const store = atQuestions();
      store.answerQuestion('unsure');
      expect(store.getState().questionIndex).toBe(1);
      expect(store.getState().answers.diabetes.answer).toBe('unsure');
    });

    it('moves on at once after "yes" when nothing more is asked', () => {
      const store = atQuestions();
      store.answerQuestion('yes');
      expect(store.getState().questionIndex).toBe(1);
    });

    it('stays on a "yes" that needs a side and a follow-up until both are given', () => {
      const store = atQuestions();
      store.answerQuestion('no');
      store.answerQuestion('no');
      expect(store.getState().questionIndex).toBe(2); // pain
      store.answerQuestion('yes');
      store.nextQuestion();
      expect(store.getState().questionIndex).toBe(2);
      store.setQuestionSide('R');
      store.nextQuestion();
      expect(store.getState().questionIndex).toBe(2);
      store.answerFollowUp('no');
      store.nextQuestion();
      expect(store.getState().questionIndex).toBe(3);
      expect(store.getState().answers.pain).toEqual({ answer: 'yes', side: 'R' });
      expect(store.getState().answers.painStopsWalking.answer).toBe('no');
    });

    it('clears a follow-up when its question changes from yes to no', () => {
      const store = atQuestions();
      store.answerQuestion('no');
      store.answerQuestion('no');
      store.answerQuestion('yes');
      store.answerFollowUp('yes');
      store.answerQuestion('no');
      expect(store.getState().answers.painStopsWalking.answer).toBeNull();
      expect(store.getState().answers.pain.side).toBeNull();
    });

    it('skips the scan when an answer is urgent', () => {
      const store = atQuestions();
      for (let i = 0; i < QUESTION_COUNT; i += 1) {
        if (i === 2) {
          store.answerQuestion('yes');
          store.setQuestionSide('L');
          store.answerFollowUp('yes');
          store.nextQuestion();
        } else store.answerQuestion('no');
      }
      expect(store.getState().screen).toBe('result');
      expect(selectResult(store.getState())?.category).toBe('urgent');
    });

    it('goes back to the handover from the first question', () => {
      const store = atQuestions();
      store.previousQuestion();
      expect(store.getState().screen).toBe('handover');
    });
  });

  describe('step 4: the scan', () => {
    it('only produces a result once all sensors have been read', () => {
      const store = new ScreeningStore(createInitialState('high'));
      store.setScenario('high');
      store.setReadings(readings('high'));
      expect(selectResult(store.getState())).toBeNull();
      store.setScanProgress(SENSOR_COUNT);
      expect(selectResult(store.getState())?.category).toBe('high');
    });

    it('clamps scan progress to the sensor count', () => {
      const store = new ScreeningStore();
      store.setScanProgress(SENSOR_COUNT + 5);
      expect(store.getState().scanProgress).toBe(SENSOR_COUNT);
    });

    it('starts a fresh scan when navigating to the scan screen', () => {
      const store = new ScreeningStore();
      store.setReadings(readings('moderate'));
      store.setSensorError('noFeet');
      store.goTo('scan');
      const state = store.getState();
      expect(state.readings).toBeNull();
      expect(state.sensorError).toBeNull();
      expect(state.scanProgress).toBe(0);
    });
  });

  it('loads a scenario with its exam and answers, and discards a finished scan', () => {
    const store = new ScreeningStore(createInitialState('low'));
    store.setReadings(readings('low'));
    store.setScanProgress(SENSOR_COUNT);
    store.setScenario('high');
    const state = store.getState();
    expect(state.readings).toBeNull();
    expect(state.answers.diabetes.answer).toBe('yes');
    expect(state.exam.lossOfSensation).toEqual({ answer: 'yes', side: 'both' });
    expect(selectResult(state)).toBeNull();
  });

  it('switching sensor source drops any scan and device state', () => {
    const store = new ScreeningStore();
    store.setReadings(readings('moderate'));
    store.setDeviceStatus('connected');
    store.setLivePressure(SCENARIOS.low.pressure);
    store.setSensorMode('esp32');
    const state = store.getState();
    expect(state.readings).toBeNull();
    expect(state.deviceStatus).toBe('disconnected');
    expect(state.livePressure).toBeNull();
    expect(usesDevice(state)).toBe(true);
  });

  it('opens and closes the demo drawer, closed at start', () => {
    const store = new ScreeningStore();
    expect(store.getState().demoOpen).toBe(false);
    store.setDemoOpen(true);
    expect(store.getState().demoOpen).toBe(true);
  });

  it('labels everything except the real board as simulated', () => {
    const store = new ScreeningStore();
    expect(showsSimulatedData(store.getState())).toBe(true);
    store.setSensorMode('fakeDevice');
    expect(showsSimulatedData(store.getState())).toBe(true);
    store.setSensorMode('esp32');
    expect(showsSimulatedData(store.getState())).toBe(false);
    store.goTo('volunteer');
    expect(showsSimulatedData(store.getState())).toBe(true);
  });

  it('clears live data and any calibration step when the device drops', () => {
    const store = new ScreeningStore();
    store.setDeviceStatus('connected');
    store.setLivePressure(SCENARIOS.low.pressure);
    store.setCalibrating('zero');
    store.setDeviceStatus('error');
    expect(store.getState().livePressure).toBeNull();
    expect(store.getState().calibrating).toBeNull();
  });

  it('stores a new calibration with its weak sensors and ends the step', () => {
    const store = new ScreeningStore();
    store.setCalibrating('reference');
    const calibration = { ...DEFAULT_CALIBRATION, referencedAt: '2026-10-09T08:00:00.000Z' };
    store.setCalibration(calibration, [3]);
    const state = store.getState();
    expect(state.calibration).toBe(calibration);
    expect(state.weakSensors).toEqual([3]);
    expect(state.calibrating).toBeNull();
  });
});
