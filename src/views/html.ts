const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape any value that is not a fixed string from the copy files before it goes into markup. */
export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);
}
