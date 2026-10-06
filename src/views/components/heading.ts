import { directionOf, otherLanguage, type Bilingual } from '../../i18n/translate';
import type { ViewContext } from '../context';

/** Heading in the active language with the other language as a quieter second line. */
export function bilingualHeading(
  ctx: ViewContext,
  text: Bilingual,
  level: 'h1' | 'h2' = 'h1',
  vars?: Readonly<Record<string, string | number>>,
): string {
  const second = otherLanguage(ctx.language);
  return `<${level} class="k-heading k-${level}">${ctx.t(text, vars)}<span class="second" lang="${second}" dir="${directionOf(second)}">${ctx.tOther(text, vars)}</span></${level}>`;
}
