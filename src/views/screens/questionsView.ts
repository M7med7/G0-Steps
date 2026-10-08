import { QUESTIONS, UI } from '../../i18n/copy';
import { QUESTION_COUNT, QUESTION_ORDER } from '../../models/questions';
import { currentQuestion } from '../../models/ScreeningStore';
import type { AnswerKey } from '../../models/types';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

function answerChip(ctx: ViewContext, key: AnswerKey): string {
  if (!ctx.state.answered[key]) return '<span class="chip">—</span>';
  return ctx.state.answers[key]
    ? `<span class="chip chip-yes">${ctx.t(UI.yes)}</span>`
    : `<span class="chip">${ctx.t(UI.no)}</span>`;
}

export function renderQuestions(ctx: ViewContext): string {
  const { state } = ctx;
  const key = currentQuestion(state);
  const copy = QUESTIONS[key];
  const isAnswered = Boolean(state.answered[key]);
  const value = state.answers[key];

  const answerList = QUESTION_ORDER.map(
    (k, i) => `<li class="${i === state.questionIndex ? 'current' : ''}"><span>${ctx.t(QUESTIONS[k].short)}</span>${answerChip(ctx, k)}</li>`,
  ).join('');

  const segments = QUESTION_ORDER.map(
    (_, i) => `<li class="${i < state.questionIndex ? 'done' : i === state.questionIndex ? 'now' : ''}"></li>`,
  ).join('');

  // The card is keyed by question, so each new question slides in instead of just swapping text.
  return `<section class="guide">
      <div class="q-head">
        <span class="count">${ctx.t(UI.questionCount, { n: state.questionIndex + 1, total: QUESTION_COUNT })}</span>
        <ol class="q-progress" aria-hidden="true">${segments}</ol>
      </div>
      <div class="q-card" data-key="q-${key}">
        ${bilingualHeading(ctx, copy.question)}
        <div class="row answers">
          <button type="button" class="btn btn-ghost btn-answer" data-action="answer" data-value="yes" aria-pressed="${isAnswered && value}">${ICONS.check}${ctx.t(UI.yes)}</button>
          <button type="button" class="btn btn-ghost btn-answer" data-action="answer" data-value="no" aria-pressed="${isAnswered && !value}">${ICONS.cross}${ctx.t(UI.no)}</button>
        </div>
      </div>
      <div class="push-end"><button type="button" class="text-button" data-action="previous-question">${ctx.t(UI.back)}</button></div>
    </section>
    <aside class="foot-pane">
      <div class="why" data-key="why-${key}"><b>${ctx.t(UI.whyWeAsk)}</b><p>${ctx.t(copy.why)}</p></div>
      <h2 class="pane-title">${ctx.t(UI.answers)}</h2>
      <ul class="answer-list">${answerList}</ul>
    </aside>`;
}
