import type { RiskLevel } from '../models/types';

const svg = (body: string, extra = ''): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

export const ICONS = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  cross: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', ' class="flip-rtl"'),
  dot: '<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-dot"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>',
  cube: svg('<path d="M12 2.8l8 4.4v9.6l-8 4.4-8-4.4V7.2z"/><path d="M4 7.2l8 4.4 8-4.4M12 11.6v9.6"/>'),
} as const;

export const RISK_ICONS: Readonly<Record<RiskLevel, string>> = {
  low: svg('<circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.3l3 3 6-6.3"/>'),
  moderate: svg('<path d="M12 3.2L22 20.5H2L12 3.2z"/><path d="M12 9.5v5"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/>'),
  high: svg('<path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2z"/><path d="M12 7.5v6"/><circle cx="12" cy="16.6" r=".6" fill="currentColor"/>'),
};
