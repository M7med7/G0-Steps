import { parseFrame, type RawFrame } from '../models/pressureProtocol';
import { LineBuffer } from './LineBuffer';

export type FrameListener = (frame: RawFrame) => void;
export type LostListener = (error: unknown) => void;

/** A pressure platform that streams frames: the real ESP32 over USB, or the fake one. */
export interface PressureDevice {
  /** True for the fake device; its readings are always labelled simulated. */
  readonly simulated: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Returns a function that stops listening. */
  onFrame(listener: FrameListener): () => void;
  /** Called when the connection drops on its own, for example when the cable is pulled. */
  onLost(listener: LostListener): () => void;
}

/** Shared by both devices: incoming text goes through the same line buffer and parser. */
export abstract class LineDevice implements PressureDevice {
  abstract readonly simulated: boolean;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  private readonly lines = new LineBuffer();
  private readonly frameListeners = new Set<FrameListener>();
  private readonly lostListeners = new Set<LostListener>();

  onFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  onLost(listener: LostListener): () => void {
    this.lostListeners.add(listener);
    return () => this.lostListeners.delete(listener);
  }

  protected receive(text: string): void {
    for (const line of this.lines.push(text)) {
      const frame = parseFrame(line);
      if (frame) this.frameListeners.forEach((listener) => listener(frame));
    }
  }

  protected lost(error: unknown): void {
    this.lostListeners.forEach((listener) => listener(error));
  }
}
