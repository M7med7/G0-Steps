import { EXAM_COPY, EXAM_GROUP_COPY, UI } from '../../i18n/copy';
import { EXAM_GROUPS, EXAM_ITEMS, type ExamGroup } from '../../models/questions';
import { isTestingStopped } from '../../models/ScreeningStore';
import { answerButtons, sidePicker } from '../components/answerControls';
import { bilingualHeading } from '../components/heading';
import { profileStrip } from '../components/profileStrip';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

function examGroup(ctx: ViewContext, group: ExamGroup): string {
  const rows = EXAM_ITEMS.filter((item) => item.group === group)
    .map(({ key }) => {
      const response = ctx.state.exam[key];
      return `<li class="exam-item${response.answer === 'yes' ? ' is-yes' : ''}">
          <span class="exam-label">${ctx.t(EXAM_COPY[key])}</span>
          ${answerButtons(ctx.l, response.answer, 'exam-answer', { item: key }, 'compact')}
          ${sidePicker(ctx.l, response, 'exam-side', { item: key })}
        </li>`;
    })
    .join('');
  const copy = EXAM_GROUP_COPY[group];
  return `<section class="exam-group exam-${group}">
      <h2 class="pane-title">${ctx.t(copy.title)}</h2>
      ${group === 'inspect' ? '' : `<p class="note">${ctx.t(copy.note)}</p>`}
      <ul class="exam-list">${rows}</ul>
    </section>`;
}

/** Step 2, for the medical volunteer: examine first, then measure. */
export function renderExam(ctx: ViewContext): string {
  const remaining = EXAM_ITEMS.filter(({ key }) => ctx.state.exam[key].answer === null).length;
  const urgent = isTestingStopped(ctx.state);
  const status = remaining ? ctx.t(UI.examRemaining, { n: remaining }) : ctx.t(UI.examDone);
  const proceed = urgent
    ? `<button type="button" class="btn btn-urgent btn-small" data-action="finish-exam">${ctx.t(UI.examUrgent)}${ICONS.arrow}</button>`
    : `<button type="button" class="btn btn-primary btn-small btn-cta" data-action="finish-exam">${ctx.t(UI.examContinue)}${ICONS.arrow}</button>`;
  const [first, ...rest] = EXAM_GROUPS;
  return `<section class="guide exam">
      ${bilingualHeading(ctx, UI.examTitle, 'h2')}
      ${profileStrip(ctx)}
      <p class="note">${ctx.t(UI.examLede)} ${ctx.t(UI.examNote)}</p>
      ${first ? examGroup(ctx, first) : ''}
    </section>
    <aside class="foot-pane exam-pane">
      ${rest.map((group) => examGroup(ctx, group)).join('')}
      <div class="exam-footer">
        <span class="note${remaining ? ' is-missing' : ''}" aria-live="polite">${status}</span>
        ${proceed}
      </div>
    </aside>`;
}
