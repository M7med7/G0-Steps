import { describe, expect, it } from 'vitest';
import { LineBuffer } from './LineBuffer';

describe('LineBuffer', () => {
  it('joins lines split across chunks', () => {
    const buffer = new LineBuffer();
    expect(buffer.push('{"raw":[1,2')).toEqual([]);
    expect(buffer.push(',3]}\n{"raw"')).toEqual(['{"raw":[1,2,3]}']);
    expect(buffer.push(':[4]}\r\n')).toEqual(['{"raw":[4]}']);
  });

  it('skips blank lines', () => {
    expect(new LineBuffer().push('\n\r\na\n\n')).toEqual(['a']);
  });

  it('drops a runaway line with no newline', () => {
    const buffer = new LineBuffer();
    buffer.push('x'.repeat(600));
    expect(buffer.push('ok\n')).toEqual(['ok']);
  });
});
