import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CALIBRATION, formatFrame, SENSOR_ORDER } from '../models/pressureProtocol';
import { SCENARIOS } from '../models/scenarios';
import type { PressureMap, SensorReadings } from '../models/types';
import { DeviceSource } from './DeviceSource';
import { FakeDevice, FRAME_INTERVAL_MS } from './FakeDevice';
import { SensorReadError } from './SensorSource';
import { WebSerialDevice } from './WebSerialDevice';

const EMPTY: PressureMap = {
  L: { hallux: 0, medialForefoot: 0, lateralForefoot: 0, heel: 0 },
  R: { hallux: 0, medialForefoot: 0, lateralForefoot: 0, heel: 0 },
};
const noNoise = (): number => 0.5;
const isReadings = (value: unknown): value is SensorReadings => typeof value === 'object' && value !== null && 'pressure' in value;

describe('FakeDevice → DeviceSource (the same path the real board uses)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Settles to the readings or the error, so a rejection is caught before the fake clock moves on. */
  async function capture(target: PressureMap, captureMs = 2000): Promise<SensorReadings | unknown> {
    const device = new FakeDevice(() => target, noNoise, () => Date.now());
    await device.connect();
    // Let the fake pilgrim settle before the scan starts.
    await vi.advanceTimersByTimeAsync(2000);
    const reading = new DeviceSource(device, DEFAULT_CALIBRATION, { captureMs, now: () => new Date('2026-10-09T08:00:00.000Z') })
      .read()
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(captureMs);
    await device.disconnect();
    return reading;
  }

  it('reproduces the scenario load through the text protocol, labelled simulated', async () => {
    const readings = await capture(SCENARIOS.high.pressure);
    if (!isReadings(readings)) throw readings;
    expect(readings.source).toBe('simulated');
    expect(readings.capturedAt).toBe('2026-10-09T08:00:00.000Z');
    for (const [foot, zone] of SENSOR_ORDER) {
      expect(readings.pressure[foot][zone]).toBeCloseTo(SCENARIOS.high.pressure[foot][zone], 2);
    }
  });

  it('reports nobody standing when the platform is empty', async () => {
    expect(await capture(EMPTY)).toEqual(new SensorReadError('noFeet'));
  });

  it('streams about 20 frames a second', async () => {
    const device = new FakeDevice(() => SCENARIOS.low.pressure, noNoise);
    const listener = vi.fn();
    device.onFrame(listener);
    await device.connect();
    await vi.advanceTimersByTimeAsync(1000);
    await device.disconnect();
    expect(listener).toHaveBeenCalledTimes(1000 / FRAME_INTERVAL_MS);
  });

  it('reports no data when the device sends nothing during the capture', async () => {
    const silent = new FakeDevice(() => SCENARIOS.low.pressure, noNoise);
    const reading = new DeviceSource(silent, DEFAULT_CALIBRATION, { captureMs: 1000 }).read().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await reading).toEqual(new SensorReadError('noData'));
  });
});

/** A stand-in serial port whose readable stream we control. */
function fakeSerial(): { serial: Serial; send: (text: string) => void; end: () => void; closed: () => boolean } {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let isClosed = false;
  const readable = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  const port: SerialPort = {
    readable,
    open: async () => undefined,
    close: async () => void (isClosed = true),
  };
  return {
    serial: { requestPort: async () => port },
    send: (text) => controller?.enqueue(new TextEncoder().encode(text)),
    end: () => controller?.close(),
    closed: () => isClosed,
  };
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('WebSerialDevice', () => {
  it('turns serial bytes, split anywhere, into frames', async () => {
    const port = fakeSerial();
    const device = new WebSerialDevice(port.serial);
    const frames: number[][] = [];
    device.onFrame((frame) => frames.push([...frame]));
    await device.connect();
    const line = `${formatFrame([1, 2, 3, 4, 5, 6, 7, 8])}\n`;
    port.send('{"hello":"footguard"}\n');
    port.send(line.slice(0, 7));
    port.send(line.slice(7));
    await tick();
    expect(frames).toEqual([[1, 2, 3, 4, 5, 6, 7, 8]]);
    await device.disconnect();
    expect(port.closed()).toBe(true);
  });

  it('reports a lost connection when the stream ends on its own', async () => {
    const port = fakeSerial();
    const device = new WebSerialDevice(port.serial);
    const lost = vi.fn();
    device.onLost(lost);
    await device.connect();
    port.end();
    await tick();
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('does not report a lost connection after a normal disconnect', async () => {
    const port = fakeSerial();
    const device = new WebSerialDevice(port.serial);
    const lost = vi.fn();
    device.onLost(lost);
    await device.connect();
    await device.disconnect();
    await tick();
    expect(lost).not.toHaveBeenCalled();
  });
});
