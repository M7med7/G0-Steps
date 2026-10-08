/** Longest line kept while waiting for its newline. Anything longer is noise and is dropped. */
const MAX_PENDING = 512;

/** Collects serial text, which arrives in arbitrary chunks, and hands back complete lines. */
export class LineBuffer {
  private pending = '';

  push(chunk: string): string[] {
    const parts = (this.pending + chunk).split(/\r?\n/);
    this.pending = parts.pop() ?? '';
    if (this.pending.length > MAX_PENDING) this.pending = '';
    return parts.filter((line) => line.trim().length > 0);
  }
}
