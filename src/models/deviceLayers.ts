/*
 * The station's physical layers, top to bottom, as shown in the team's exploded concept render.
 * Pure data and state transitions for the 3D device view. No DOM, no Three.js.
 */
import type { Language } from './types';

export type DeviceLayerId =
  | 'topGlass'
  | 'cameras'
  | 'insulation'
  | 'circuit'
  | 'innerFrame'
  | 'supports'
  | 'pressureSensors'
  | 'outerShell';

export type DevicePartId = 'mlxCamera' | 'esp32Camera';

/** Top to bottom, the order the panel lists them and the arrow keys step through them. */
export const DEVICE_LAYERS: readonly DeviceLayerId[] = [
  'topGlass',
  'cameras',
  'insulation',
  'circuit',
  'innerFrame',
  'supports',
  'pressureSensors',
  'outerShell',
];

/** Parts inside a layer that can be focused on their own. */
export const LAYER_PARTS: Readonly<Record<DeviceLayerId, readonly DevicePartId[]>> = {
  topGlass: [],
  cameras: ['esp32Camera', 'mlxCamera'],
  insulation: [],
  circuit: [],
  innerFrame: [],
  supports: [],
  pressureSensors: [],
  outerShell: [],
};

export const isDeviceLayerId = (value: unknown): value is DeviceLayerId =>
  typeof value === 'string' && (DEVICE_LAYERS as readonly string[]).includes(value);

export const isDevicePartId = (value: unknown): value is DevicePartId => value === 'mlxCamera' || value === 'esp32Camera';

export function layerOfPart(part: DevicePartId): DeviceLayerId {
  const layer = DEVICE_LAYERS.find((id) => LAYER_PARTS[id].includes(part));
  if (!layer) throw new Error(`Part ${part} belongs to no layer`);
  return layer;
}

export interface DeviceSelection {
  readonly layer: DeviceLayerId;
  readonly part: DevicePartId | null;
}

/** null means the overview of the whole station. */
export type DeviceFocus = DeviceSelection | null;

/** Everything the 3D device page shows. Replaced, never mutated, on each change. */
export interface DeviceViewState {
  readonly language: Language;
  readonly exploded: boolean;
  readonly focus: DeviceFocus;
}

export function focusLayer(layer: DeviceLayerId): DeviceSelection {
  return { layer, part: null };
}

export function focusPart(part: DevicePartId): DeviceSelection {
  return { layer: layerOfPart(part), part };
}

/** Moves to the next layer down (step 1) or up (step -1), wrapping around. From the overview it starts at the top or bottom. */
export function stepLayer(focus: DeviceFocus, step: 1 | -1): DeviceSelection {
  const count = DEVICE_LAYERS.length;
  const from = focus ? DEVICE_LAYERS.indexOf(focus.layer) : step === 1 ? -1 : count;
  const next = DEVICE_LAYERS[(from + step + count) % count];
  if (!next) throw new Error('DEVICE_LAYERS is empty');
  return focusLayer(next);
}

/** Position from the top, starting at 1, for "Layer n of 8". */
export function layerNumber(layer: DeviceLayerId): number {
  return DEVICE_LAYERS.indexOf(layer) + 1;
}
