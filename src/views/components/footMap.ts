import { UI } from '../../i18n/copy';
import { zoneState } from '../../models/riskAssessment';
import { FEET, ZONES, type Foot, type PressureMap, type Zone } from '../../models/types';
import type { ViewContext } from '../context';

/** `live` shows a connected device's latest frame on every zone at once. */
export type FootMapMode = { kind: 'idle' } | { kind: 'scanning'; sensorsRead: number } | { kind: 'live' } | { kind: 'final' };

type ZoneClass = 'z-idle' | 'z-pending' | 'z-normal' | 'z-elevated' | 'z-high';

/* Right-foot plantar outline in a 200×470 box; the left foot is its mirror image. */
const SOLE_PATH =
  'M62 118 C100 100 150 104 172 128 C188 148 186 190 176 230 C168 270 160 300 158 340 C156 390 150 440 112 452 ' +
  'C74 462 50 430 52 390 C54 350 76 320 78 285 C80 255 40 240 32 200 C26 160 36 128 62 118 Z';
const LESSER_TOES: readonly (readonly [number, number, number, number])[] = [
  [112, 70, 13, 17],
  [138, 78, 12, 15],
  [158, 92, 11, 13],
  [174, 110, 9, 11],
];
const ZONE_SHAPES: Readonly<Record<Zone, (cls: ZoneClass) => string>> = {
  hallux: (c) => `<ellipse class="zone ${c}" cx="70" cy="78" rx="24" ry="30"/>`,
  medialForefoot: (c) => `<circle class="zone ${c}" cx="70" cy="162" r="25"/>`,
  lateralForefoot: (c) => `<circle class="zone ${c}" cx="148" cy="172" r="23"/>`,
  heel: (c) => `<ellipse class="zone ${c}" cx="106" cy="398" rx="34" ry="38"/>`,
};

/** Order in which the 8 sensors report during the scan animation. */
const READ_ORDER: readonly (readonly [Foot, Zone])[] = ZONES.flatMap((zone) => FEET.map((foot) => [foot, zone] as const));

function zoneClass(mode: FootMapMode, pressure: PressureMap | null, foot: Foot, zone: Zone): ZoneClass {
  if (mode.kind === 'idle') return 'z-idle';
  if (!pressure) return 'z-pending';
  if (mode.kind === 'scanning') {
    const order = READ_ORDER.findIndex(([f, z]) => f === foot && z === zone);
    if (order >= mode.sensorsRead) return 'z-pending';
  }
  return `z-${zoneState(pressure[foot][zone])}`;
}

function oneFoot(foot: Foot, mode: FootMapMode, pressure: PressureMap | null): string {
  const toes = LESSER_TOES.map(([cx, cy, rx, ry]) => `<ellipse class="toe" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join('');
  const zones = ZONES.map((zone) => ZONE_SHAPES[zone](zoneClass(mode, pressure, foot, zone))).join('');
  return `<path class="sole" d="${SOLE_PATH}"/>${toes}${zones}`;
}

/** Both feet in plantar view. The left foot is always on the viewer's left, whatever the text direction. */
export function renderFootMap(ctx: ViewContext, mode: FootMapMode, pressure: PressureMap | null): string {
  return `<div class="feet"><svg viewBox="0 0 440 500" role="img" aria-label="${ctx.t(UI.footMapLabel)}">
    <g transform="translate(200 0) scale(-1 1)">${oneFoot('L', mode, pressure)}</g>
    <g transform="translate(240 0)">${oneFoot('R', mode, pressure)}</g>
    <text class="foot-label" x="100" y="492">${ctx.t(UI.leftShort)}</text>
    <text class="foot-label" x="340" y="492">${ctx.t(UI.rightShort)}</text>
  </svg></div>`;
}

export function renderLegend(ctx: ViewContext): string {
  return `<ul class="legend">
    <li><span class="swatch swatch-normal"></span>${ctx.t(UI.legendNormal)}</li>
    <li><span class="swatch swatch-raised"></span>${ctx.t(UI.legendRaised)}</li>
    <li><span class="swatch swatch-high"></span>${ctx.t(UI.legendHigh)}</li>
  </ul>`;
}
