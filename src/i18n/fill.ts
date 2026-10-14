/** Fills {placeholders}; unknown ones stay visible so a missing value is easy to spot. */
export function fill(text: string, vars: Readonly<Record<string, string | number>> = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
