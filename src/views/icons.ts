import type { RiskLevel } from '../models/types';

const svg = (body: string, extra = ''): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

export const ICONS = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  cross: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', ' class="flip-rtl"'),
  dot: '<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-dot"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>',
} as const;

export const RISK_ICONS: Readonly<Record<RiskLevel, string>> = {
  low: svg('<circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.3l3 3 6-6.3"/>'),
  moderate: svg('<path d="M12 3.2L22 20.5H2L12 3.2z"/><path d="M12 9.5v5"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/>'),
  high: svg('<path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2z"/><path d="M12 7.5v6"/><circle cx="12" cy="16.6" r=".6" fill="currentColor"/>'),
};

/** Shield with a footprint: the team's mark, simplified for small sizes. */
export const LOGO = `<svg viewBox="0 0 40 44" aria-hidden="true" class="logo">
  <path d="M20 2l16 6v12c0 10-7 18-16 22C11 38 4 30 4 20V8l16-6z" class="logo-shield"/>
  <ellipse cx="20" cy="29" rx="5" ry="6.5" class="logo-print"/>
  <circle cx="14.5" cy="17" r="2.3" class="logo-print"/>
  <circle cx="19.5" cy="14.6" r="2.6" class="logo-accent"/>
  <circle cx="24.6" cy="16.4" r="2.1" class="logo-print"/>
  <circle cx="27.6" cy="20" r="1.8" class="logo-print"/>
</svg>`;
