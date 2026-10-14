import { isQuestionComplete, QUESTION_COUNT, QUESTIONS } from '../../models/questions';
import { currentQuestion } from '../../models/ScreeningStore';
import type { Response } from '../../models/types';
import { answerButtons, sidePicker } from '../components/answerControls';
import { localeHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

function answerChip(ctx: ViewContext, response: Response): string {
  if (response.answer === null) return '<span class="chip">—</span>';
  const side = response.answer === 'yes' && response.side ? ` · ${ctx.l.sides[response.side]}` : '';
  return `<span class="chip${response.answer === 'yes' ? ' chip-yes' : ''}">${ctx.l[response.answer]}${side}</span>`;
}

/** After a "yes": which foot, the follow-up, and Next once both are answered. */
function extras(ctx: ViewContext): string {
  const { state, l } = ctx;
  const question = currentQuestion(state);
  const response = state.answers[question.key];
  if (response.answer !== 'yes' || (!question.asksSide && !question.followUp)) return '';
  const side = question.asksSide
    ? `<div class="q-extra"><b>${l.whichFoot}</b>${sidePicker(l, response, 'question-side')}</div>`
    : '';
  const followUp = question.followUp
    ? `<div class="q-extra"><b>${l.followUps[question.followUp].question}</b>${answerButtons(l, state.answers[question.followUp].answer, 'follow-up', {}, 'compact')}</div>`
    : '';
  const ready = isQuestionComplete(question, state.answers);
  return `<div class="q-extras">${side}${followUp}</div>
    <div class="row push-end">
      <button type="button" class="btn btn-primary btn-small btn-cta" data-action="next-question"${ready ? '' : ' disabled'}>${l.next}${ICONS.arrow}</button>
    </div>`;
}

/** Step 3, for the pilgrim, in their language. */
export function renderQuestions(ctx: ViewContext): string {
  const { state, l } = ctx;
  const question = currentQuestion(state);
  const copy = l.questions[question.key];

  const answerList = QUESTIONS.map(
    (q, i) => `<li class="${i === state.questionIndex ? 'current' : ''}"><span>${l.questions[q.key].short}</span>${answerChip(ctx, state.answers[q.key])}</li>`,
  ).join('');
  const segments = QUESTIONS.map(
    (_, i) => `<li class="${i < state.questionIndex ? 'done' : i === state.questionIndex ? 'now' : ''}"></li>`,
  ).join('');

  const more = extras(ctx);
  // The card is keyed by question, so each new question slides in instead of just swapping text.
  return `<section class="guide">
      <div class="q-head">
        <div class="q-count-row">
          <span class="count">${ctx.fill(l.questionCount, { n: state.questionIndex + 1, total: QUESTION_COUNT })}</span>
          <button type="button" class="text-button" data-action="previous-question">${l.back}</button>
        </div>
        <ol class="q-progress" aria-hidden="true">${segments}</ol>
      </div>
      <div class="q-card${more ? ' has-extras' : ''}" data-key="q-${question.key}">
        ${localeHeading(ctx, (s) => s.questions[question.key].question, 'h2')}
        ${answerButtons(l, state.answers[question.key].answer, 'answer')}
        ${more}
      </div>
    </section>
    <aside class="foot-pane">
      <div class="why" data-key="why-${question.key}"><b>${l.whyWeAsk}</b><p>${copy.why}</p></div>
      <h2 class="pane-title">${l.yourAnswers}</h2>
      <ul class="answer-list">${answerList}</ul>
    </aside>`;
}
