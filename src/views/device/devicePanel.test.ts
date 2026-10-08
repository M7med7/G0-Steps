import { describe, expect, it } from 'vitest';
import type { DeviceViewState } from '../../models/deviceLayers';
import { renderDevicePanel, renderDeviceTopBar } from './devicePanel';

const overview: DeviceViewState = { language: 'en', exploded: true, focus: null };

describe('device panel', () => {
  it('lists all eight layers as buttons in the overview', () => {
    const html = renderDevicePanel(overview);
    expect(html.match(/data-action="select-layer"/g)).toHaveLength(8);
    expect(html).toContain('data-layer="topGlass"');
    expect(html).toContain('data-layer="outerShell"');
  });

  it('shows a layer with its position and no parts when it has none', () => {
    const html = renderDevicePanel({ ...overview, focus: { layer: 'circuit', part: null } });
    expect(html).toContain('Layer 4 of 8');
    expect(html).toContain('Circuit board');
    expect(html).not.toContain('data-action="select-part"');
    expect(html).toContain('data-action="overview"');
  });

  it('lists both cameras and marks the one in focus', () => {
    const html = renderDevicePanel({ ...overview, focus: { layer: 'cameras', part: 'mlxCamera' } });
    expect(html).toContain('data-part="mlxCamera" aria-pressed="true"');
    expect(html).toContain('data-part="esp32Camera" aria-pressed="false"');
    expect(html).toContain('A thermal camera');
  });

  it('renders in Arabic', () => {
    expect(renderDevicePanel({ ...overview, language: 'ar', focus: { layer: 'outerShell', part: null } })).toContain('هيكل خارجي');
  });

  it('offers the opposite of the current explode state', () => {
    expect(renderDeviceTopBar(overview)).toContain('Assemble');
    expect(renderDeviceTopBar({ ...overview, exploded: false })).toContain('Explode');
  });
});
