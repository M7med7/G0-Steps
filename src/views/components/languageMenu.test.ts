import { describe, expect, it } from 'vitest';
import { createInitialState, type AppState } from '../../models/ScreeningStore';
import { LOCALES, type ScreenName } from '../../models/types';
import { createViewContext } from '../context';
import { renderDeviceTopBar } from '../device/devicePanel';
import { renderLanguageMenu } from './languageMenu';
import { renderTopBar } from './topBar';

const topBar = (screen: ScreenName, overrides: Partial<AppState> = {}): string =>
  renderTopBar(createViewContext({ ...createInitialState('low'), screen, ...overrides }));

const options = (html: string): string[] => [...html.matchAll(/class="lang-option"[^>]*data-(?:locale|language)="(\w+)"/g)].map((m) => m[1] ?? '');

describe('language menu', () => {
  it('shows only the button while closed', () => {
    const html = renderLanguageMenu({ choices: ['ar', 'en'], current: 'ar', action: 'set-language', field: 'language', isOpen: false, label: 'Language' });
    expect(html).toContain('data-action="toggle-language-menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('lang-option');
  });

  it('lists every choice in its own language and marks the current one', () => {
    const html = renderLanguageMenu({ choices: ['ar', 'en'], current: 'en', action: 'set-language', field: 'language', isOpen: true, label: 'Language' });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-language="ar" lang="ar" dir="rtl" aria-pressed="false">العربية');
    expect(html).toContain('data-language="en" lang="en" dir="ltr" aria-pressed="true">English');
  });
});

describe('top bar language button', () => {
  it('is on every screen', () => {
    const screens: ScreenName[] = ['identify', 'exam', 'handover', 'questions', 'scan', 'result', 'doctor', 'volunteer'];
    screens.forEach((screen) => expect(topBar(screen), screen).toContain('data-action="toggle-language-menu"'));
  });

  it('offers every pilgrim language on the pilgrim screens', () => {
    const html = topBar('questions', { locale: 'ur', languageMenuOpen: true });
    expect(options(html)).toEqual([...LOCALES]);
    expect(html).toContain('data-action="set-locale" data-locale="ur" lang="ur" dir="rtl" aria-pressed="true"');
  });

  it('offers Arabic and English on staff screens, and says where the other languages are', () => {
    const html = topBar('exam', { language: 'en', languageMenuOpen: true });
    expect(options(html)).toEqual(['ar', 'en']);
    expect(html).toContain('data-action="set-language"');
    expect(html).toContain(`The pilgrim picks from ${LOCALES.length} languages at handover.`);
  });

  it('is also on the 3D page, with its two languages', () => {
    const html = renderDeviceTopBar({ language: 'ar', exploded: true, focus: null, languageMenuOpen: true });
    expect(options(html)).toEqual(['ar', 'en']);
    expect(html).toContain('اختر اللغة');
  });
});
