import { LineDevice } from './PressureDevice';

/** Must match Serial.begin() in the firmware. */
export const BAUD_RATE = 115200;

/** The ESP32 platform over a USB cable, read with Web Serial (Chrome or Edge on a computer). */
export class WebSerialDevice extends LineDevice {
  readonly simulated = false;
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private reading: Promise<void> | null = null;

  constructor(private readonly serial: Serial) {
    super();
  }

  /** Opens the browser's port picker, so it has to run inside a click handler. */
  async connect(): Promise<void> {
    const port = await this.serial.requestPort();
    await port.open({ baudRate: BAUD_RATE });
    this.port = port;
    this.reading = this.readLoop(port);
  }

  async disconnect(): Promise<void> {
    const port = this.port;
    this.port = null;
    if (!port) return;
    // Cancelling the reader ends the read loop; the port can only close once the loop has released it.
    await this.reader?.cancel();
    await this.reading;
    await port.close();
  }

  private async readLoop(port: SerialPort): Promise<void> {
    if (!port.readable) {
      this.lost(new Error('The serial port is not readable'));
      return;
    }
    const reader = port.readable.getReader();
    this.reader = reader;
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        this.receive(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (this.port === port) this.lost(error);
      return;
    } finally {
      reader.releaseLock();
      this.reader = null;
    }
    // The stream ended without disconnect() being called: the board went away.
    if (this.port === port) this.lost(new Error('The serial stream ended'));
  }
}
