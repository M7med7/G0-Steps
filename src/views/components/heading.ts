import { LOCALE_META, type LocaleStrings } from '../../i18n/locales';
import { directionOf, otherLanguage, type Bilingual } from '../../i18n/translate';
import type { ViewContext } from '../context';

type Level = 'h1' | 'h2';
type Vars = Readonly<Record<string, string | number>>;

/** Staff heading in the staff language with the other one as a quieter second line. */
export function bilingualHeading(ctx: ViewContext, text: Bilingual, level: Level = 'h1', vars?: Vars): string {
  const second = otherLanguage(ctx.language);
  return `<${level} class="k-heading k-${level}">${ctx.t(text, vars)}<span class="second" lang="${second}" dir="${directionOf(second)}">${ctx.tOther(text, vars)}</span></${level}>`;
}

/** Pilgrim heading in their language, with Arabic (or English, for Arabic readers) underneath for the volunteer. */
export function localeHeading(ctx: ViewContext, pick: (strings: LocaleStrings) => string, level: Level = 'h1', vars?: Vars): string {
  const second = ctx.secondLocale;
  return `<${level} class="k-heading k-${level}">${ctx.fill(pick(ctx.l), vars)}<span class="second" lang="${second}" dir="${LOCALE_META[second].dir}">${ctx.fill(pick(ctx.lOther), vars)}</span></${level}>`;
}
