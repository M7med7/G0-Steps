/*
 * The parts of the Web Serial API this app uses. Chrome and Edge on desktop support it; TypeScript's DOM types don't include it.
 * https://wicg.github.io/serial/
 */
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
}

interface Navigator {
  /** Missing in Safari, Firefox and on most mobile browsers. */
  readonly serial?: Serial;
}
