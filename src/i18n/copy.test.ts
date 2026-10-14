import { describe, expect, it } from 'vitest';
import { DEVICE_LAYERS, LAYER_PARTS } from '../models/deviceLayers';
import { NATIONALITY_LOCALE, SAMPLE_CARDS } from '../models/pilgrimCards';
import { EXAM_GROUPS, EXAM_KEYS } from '../models/questions';
import { RULES } from '../models/rules';
import { ACTION_CATEGORIES, LOCALES } from '../models/types';
import { CATEGORY_COPY, EXAM_COPY, EXAM_GROUP_COPY, NATIONALITY_NAMES, RULE_COPY, SEX_NAMES, UI } from './copy';
import { DEVICE_LAYER_COPY, DEVICE_PART_COPY, DEVICE_UI } from './deviceCopy';
import { fill, LOCALE_META, LOCALE_STRINGS } from './locales';
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

/** Every leaf string of a locale, keyed by its path. */
function leaves(value: unknown, path = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof value === 'string') out.set(path, value);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) leaves(child, path ? `${path}.${key}` : key).forEach((v, k) => out.set(k, v));
  }
  return out;
}

const placeholders = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();

describe('staff copy', () => {
  const all: [string, Bilingual][] = [];
  collectBilingual(
    { UI, SEX_NAMES, NATIONALITY_NAMES, EXAM_GROUP_COPY, EXAM_COPY, CATEGORY_COPY, RULE_COPY, DEVICE_UI, DEVICE_LAYER_COPY, DEVICE_PART_COPY },
    'copy',
    all,
  );

  it('has non-empty Arabic and English for every string', () => {
    expect(all.length).toBeGreaterThan(100);
    const missing = all.filter(([, text]) => !text.ar.trim() || !text.en.trim()).map(([path]) => path);
    expect(missing).toEqual([]);
  });

  it('uses the same placeholders in both languages', () => {
    const mismatched = all.filter(([, text]) => placeholders(text.ar) !== placeholders(text.en)).map(([p]) => p);
    expect(mismatched).toEqual([]);
  });

  it('covers every exam item, group, category, rule, nationality and 3D layer the models use', () => {
    EXAM_KEYS.forEach((key) => expect(EXAM_COPY[key], key).toBeDefined());
    EXAM_GROUPS.forEach((group) => expect(EXAM_GROUP_COPY[group], group).toBeDefined());
    ACTION_CATEGORIES.forEach((category) => expect(CATEGORY_COPY[category], category).toBeDefined());
    RULES.forEach((rule) => expect(RULE_COPY[rule.id], rule.id).toBeDefined());
    Object.keys(NATIONALITY_LOCALE).forEach((code) => expect(NATIONALITY_NAMES[code], code).toBeDefined());
    SAMPLE_CARDS.forEach((card) => expect(NATIONALITY_LOCALE[card.nationality], card.cardId).toBeDefined());
    DEVICE_LAYERS.forEach((layer) => {
      expect(DEVICE_LAYER_COPY[layer]).toBeDefined();
      LAYER_PARTS[layer].forEach((part) => expect(DEVICE_PART_COPY[part]).toBeDefined());
    });
  });

  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate(UI.examRemaining, 'en', { n: 2 })).toBe('Not recorded yet: 2');
    expect(translate({ ar: '{x}', en: '{x}' }, 'en')).toBe('{x}');
  });
});

describe('pilgrim locales', () => {
  const english = leaves(LOCALE_STRINGS.en);

  it.each(LOCALES)('%s fills every string with the same placeholders as English', (locale) => {
    const strings = leaves(LOCALE_STRINGS[locale]);
    expect([...strings.keys()].sort()).toEqual([...english.keys()].sort());
    const empty = [...strings].filter(([, text]) => !text.trim()).map(([path]) => path);
    expect(empty).toEqual([]);
    const mismatched = [...strings].filter(([path, text]) => placeholders(text) !== placeholders(english.get(path) ?? '')).map(([p]) => p);
    expect(mismatched).toEqual([]);
  });

  it('translates the questions instead of copying the English', () => {
    const copied = LOCALES.filter((l) => l !== 'en' && LOCALE_STRINGS[l].questions.diabetes.question === LOCALE_STRINGS.en.questions.diabetes.question);
    expect(copied).toEqual([]);
  });

  it('marks only Arabic and English as reviewed, and right-to-left only for Arabic-script languages', () => {
    expect(LOCALES.filter((l) => LOCALE_META[l].reviewed)).toEqual(['ar', 'en']);
    expect(LOCALES.filter((l) => LOCALE_META[l].dir === 'rtl')).toEqual(['ar', 'ur']);
  });

  it('fills locale placeholders', () => {
    expect(fill(LOCALE_STRINGS.en.questionCount, { n: 2, total: 10 })).toBe('Question 2 of 10');
  });
});
