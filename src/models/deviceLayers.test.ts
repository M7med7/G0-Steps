import { describe, expect, it } from 'vitest';
import {
  DEVICE_LAYERS,
  LAYER_PARTS,
  focusPart,
  isDeviceLayerId,
  isDevicePartId,
  layerNumber,
  layerOfPart,
  stepLayer,
} from './deviceLayers';

describe('device layers', () => {
  it('lists eight distinct layers, glass on top and shell at the bottom', () => {
    expect(new Set(DEVICE_LAYERS).size).toBe(8);
    expect(DEVICE_LAYERS[0]).toBe('topGlass');
    expect(DEVICE_LAYERS.at(-1)).toBe('outerShell');
    expect(layerNumber('topGlass')).toBe(1);
    expect(layerNumber('outerShell')).toBe(8);
  });

  it('puts both cameras in the camera layer', () => {
    expect(LAYER_PARTS.cameras).toEqual(['esp32Camera', 'mlxCamera']);
    expect(layerOfPart('mlxCamera')).toBe('cameras');
    expect(focusPart('esp32Camera')).toEqual({ layer: 'cameras', part: 'esp32Camera' });
  });

  it('steps down and up through the layers and wraps around', () => {
    expect(stepLayer(null, 1)).toEqual({ layer: 'topGlass', part: null });
    expect(stepLayer(null, -1)).toEqual({ layer: 'outerShell', part: null });
    expect(stepLayer({ layer: 'topGlass', part: null }, 1).layer).toBe('cameras');
    expect(stepLayer({ layer: 'cameras', part: 'mlxCamera' }, -1)).toEqual({ layer: 'topGlass', part: null });
    expect(stepLayer({ layer: 'outerShell', part: null }, 1).layer).toBe('topGlass');
    expect(stepLayer({ layer: 'topGlass', part: null }, -1).layer).toBe('outerShell');
  });

  it('validates ids coming from data attributes', () => {
    expect(isDeviceLayerId('circuit')).toBe(true);
    expect(isDeviceLayerId('battery')).toBe(false);
    expect(isDeviceLayerId(undefined)).toBe(false);
    expect(isDevicePartId('mlxCamera')).toBe(true);
    expect(isDevicePartId('circuit')).toBe(false);
  });
});
