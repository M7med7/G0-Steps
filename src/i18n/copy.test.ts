import { describe, expect, it } from 'vitest';
import { DEVICE_LAYERS, LAYER_PARTS } from '../models/deviceLayers';
import { QUESTION_ORDER } from '../models/questions';
import { RECOMMENDATION_PRIORITY } from '../models/rules';
import { ZONES } from '../models/types';
import {
  DEVICE_LAYER_COPY,
  DEVICE_PART_COPY,
  DEVICE_UI,
  FLAG_REASONS,
  PILGRIM_LANGUAGES,
  QUESTIONS,
  RECOMMENDATIONS,
  RISK_LEVELS,
  UI,
  ZONE_NAMES,
} from './copy';
import { translate, type Bilingual } from './translate';

function collectBilingual(value: unknown, path: string, out: [string, Bilingual][]): void {
  if (value && typeof value === 'object') {
    if ('ar' in value && 'en' in value && Object.keys(value).length === 2) {
      out.push([path, value as Bilingual]);
      return;
    }
    for (const [key, child] of Object.entries(value)) collectBilingual(child, `${path}.${key}`, out);
  }
}

describe('copy', () => {
  const all: [string, Bilingual][] = [];
  collectBilingual(
    { UI, QUESTIONS, ZONE_NAMES, FLAG_REASONS, RISK_LEVELS, RECOMMENDATIONS, PILGRIM_LANGUAGES, DEVICE_UI, DEVICE_LAYER_COPY, DEVICE_PART_COPY },
    'copy',
    all,
  );

  it('has non-empty Arabic and English for every string', () => {
    expect(all.length).toBeGreaterThan(50);
    const missing = all.filter(([, text]) => !text.ar.trim() || !text.en.trim()).map(([path]) => path);
    expect(missing).toEqual([]);
  });

  it('uses the same placeholders in both languages', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const mismatched = all.filter(([, text]) => placeholders(text.ar).join() !== placeholders(text.en).join()).map(([p]) => p);
    expect(mismatched).toEqual([]);
  });

  it('covers every question, zone and recommendation the models use', () => {
    QUESTION_ORDER.forEach((key) => expect(QUESTIONS[key]).toBeDefined());
    ZONES.forEach((zone) => expect(ZONE_NAMES[zone]).toBeDefined());
    RECOMMENDATION_PRIORITY.forEach((key) => expect(RECOMMENDATIONS[key]).toBeDefined());
    DEVICE_LAYERS.forEach((layer) => {
      expect(DEVICE_LAYER_COPY[layer]).toBeDefined();
      LAYER_PARTS[layer].forEach((part) => expect(DEVICE_PART_COPY[part]).toBeDefined());
    });
  });

  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate(UI.questionCount, 'en', { n: 2, total: 6 })).toBe('Question 2 of 6');
    expect(translate({ ar: '{x}', en: '{x}' }, 'en')).toBe('{x}');
  });
});
