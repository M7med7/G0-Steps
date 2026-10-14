import { NATIONALITY_NAMES, SEX_NAMES, UI } from '../../i18n/copy';
import type { ViewContext } from '../context';
import { escapeHtml } from '../html';
import { ICONS } from '../icons';

/** Who is being screened, from the card. Shown to staff only, and never stored. */
export function profileStrip(ctx: ViewContext): string {
  const profile = ctx.state.profile;
  if (!profile) return `<div class="profile-strip is-anonymous">${ICONS.card}<span>${ctx.t(UI.anonymous)}</span></div>`;
  const country = NATIONALITY_NAMES[profile.nationality];
  return `<div class="profile-strip">
      ${ICONS.card}
      <b dir="auto">${escapeHtml(profile.name)}</b>
      <span>${ctx.t(UI.age)} ${escapeHtml(profile.age)}</span>
      <span>${ctx.t(SEX_NAMES[profile.sex])}</span>
      <span>${country ? ctx.t(country) : escapeHtml(profile.nationality)}</span>
      <span class="chip">${ctx.t(UI.sampleRecord)}</span>
    </div>`;
}
