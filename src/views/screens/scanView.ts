import { SENSOR_ERRORS, UI } from '../../i18n/copy';
import { isScanComplete, SENSOR_COUNT, usesDevice } from '../../models/ScreeningStore';
import { renderFootMap, renderLegend } from '../components/footMap';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

function renderSensorError(ctx: ViewContext, reason: keyof typeof SENSOR_ERRORS): string {
  return `<section class="guide">
      ${bilingualHeading(ctx, UI.scanTitle)}
      <p class="error-message" role="alert">${ctx.t(SENSOR_ERRORS[reason])}</p>
      <div class="row push-end">
        <button type="button" class="btn btn-primary" data-action="navigate" data-screen="scan">${ctx.t(UI.retry)}</button>
      </div>
    </section>
    <aside class="foot-pane">${renderFootMap(ctx, { kind: 'idle' }, null)}</aside>`;
}

export function renderScan(ctx: ViewContext): string {
  const { state } = ctx;
  if (state.sensorError) return renderSensorError(ctx, state.sensorError);
  const done = isScanComplete(state);
  const read = state.scanProgress;
  // A device records all 8 sensors at once, so it shows the live map instead of sensors reporting one by one.
  const recording = usesDevice(state) && !done;
  const status = done ? ctx.t(UI.scanComplete) : recording ? ctx.t(UI.scanRecording) : ctx.t(UI.scanReading, { k: read, total: SENSOR_COUNT });
  const map = recording
    ? renderFootMap(ctx, { kind: 'live' }, state.livePressure)
    : renderFootMap(ctx, { kind: 'scanning', sensorsRead: read }, state.readings?.pressure ?? null);

  return `<section class="guide">
      ${bilingualHeading(ctx, done ? UI.scanComplete : UI.scanTitle)}
      <p class="lede">${ctx.t(UI.scanLede)}</p>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${SENSOR_COUNT}" aria-valuenow="${read}" aria-label="${status}">
        <i style="width:${(read / SENSOR_COUNT) * 100}%"></i>
      </div>
      <span class="count" aria-live="polite">${status}</span>
      <ul class="sensors">
        <li class="${done ? 'ok' : ''}"><span>${ctx.t(UI.sensorPressure)}</span><span>${done ? '✓ ' : ''}${recording ? `${Math.round((read / SENSOR_COUNT) * 100)}%` : `${read}/${SENSOR_COUNT}`}</span></li>
        <li><span>${ctx.t(UI.sensorThermal)}</span><span>${ctx.t(UI.notConnected)}</span></li>
        <li><span>${ctx.t(UI.sensorCamera)}</span><span>${ctx.t(UI.notConnected)}</span></li>
      </ul>
      <div class="row push-end">
        ${
          done
            ? `<button type="button" class="btn btn-primary" data-action="navigate" data-screen="result">${ICONS.arrow}${ctx.t(UI.showResult)}</button>`
            : recording
              ? ''
              : `<button type="button" class="text-button" data-action="skip-scan">${ctx.t(UI.skipWait)}</button>`
        }
      </div>
    </section>
    <aside class="foot-pane">
      ${map}
      ${renderLegend(ctx)}
    </aside>`;
}
