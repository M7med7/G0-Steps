import { SENSOR_ERRORS, UI } from '../../i18n/copy';
import { isScanComplete, SENSOR_COUNT, usesDevice } from '../../models/ScreeningStore';
import { renderFootMap, renderLegend } from '../components/footMap';
import { bilingualHeading } from '../components/heading';
import type { ViewContext } from '../context';
import { ICONS } from '../icons';

const SPINNER = '<span class="spinner" aria-hidden="true"></span>';
const DASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M7 12h10"/></svg>';

function renderSensorError(ctx: ViewContext, reason: keyof typeof SENSOR_ERRORS): string {
  return `<section class="guide">
      ${bilingualHeading(ctx, UI.scanTitle)}
      <p class="error-message" role="alert">${ctx.t(SENSOR_ERRORS[reason])}</p>
      <div class="row push-end">
        <button type="button" class="btn btn-primary" data-action="navigate" data-screen="scan">${ctx.t(UI.retry)}</button>
      </div>
    </section>
    <aside class="foot-pane stage-pane">${renderFootMap(ctx, { kind: 'idle' }, null)}</aside>`;
}

/** Circular progress; the ring and the number animate as the scan moves on. */
function progressRing(percent: number, label: string, done: boolean): string {
  return `<div class="scan-progress${done ? ' is-done' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${label}">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" r="52"/>
        <circle class="fill" cx="60" cy="60" r="52" pathLength="100" style="stroke-dashoffset:${100 - percent}"/>
      </svg>
      <b>${done ? ICONS.check : `${percent}<small>%</small>`}</b>
    </div>`;
}

export function renderScan(ctx: ViewContext): string {
  const { state } = ctx;
  if (state.sensorError) return renderSensorError(ctx, state.sensorError);
  const done = isScanComplete(state);
  const read = state.scanProgress;
  // A device records all 8 sensors at once, so it shows the live map instead of sensors reporting one by one.
  const recording = usesDevice(state) && !done;
  const percent = done ? 100 : Math.round((read / SENSOR_COUNT) * 100);
  const status = done ? ctx.t(UI.scanComplete) : recording ? ctx.t(UI.scanRecording) : ctx.t(UI.scanReading, { k: read, total: SENSOR_COUNT });
  const map = recording
    ? renderFootMap(ctx, { kind: 'live' }, state.livePressure)
    : renderFootMap(ctx, { kind: 'scanning', sensorsRead: read }, state.readings?.pressure ?? null);

  return `<section class="guide scan">
      ${bilingualHeading(ctx, done ? UI.scanComplete : UI.scanTitle)}
      <p class="lede">${ctx.t(UI.scanLede)}</p>
      <div class="scan-meter">
        ${progressRing(percent, status, done)}
        <p class="scan-status" aria-live="polite">${status}</p>
      </div>
      <ul class="sensors">
        <li class="${done ? 'ok' : 'busy'}">${done ? ICONS.check : SPINNER}<span>${ctx.t(UI.sensorPressure)}</span><span>${done ? `${SENSOR_COUNT}/${SENSOR_COUNT}` : recording ? `${percent}%` : `${read}/${SENSOR_COUNT}`}</span></li>
        <li class="off">${DASH}<span>${ctx.t(UI.sensorThermal)}</span><span>${ctx.t(UI.notConnected)}</span></li>
        <li class="off">${DASH}<span>${ctx.t(UI.sensorCamera)}</span><span>${ctx.t(UI.notConnected)}</span></li>
      </ul>
      <div class="row push-end">
        ${
          done
            ? `<button type="button" class="btn btn-primary btn-cta" data-action="navigate" data-screen="result">${ctx.t(UI.showResult)}${ICONS.arrow}</button>`
            : recording
              ? ''
              : `<button type="button" class="text-button" data-action="skip-scan">${ctx.t(UI.skipWait)}</button>`
        }
      </div>
    </section>
    <aside class="foot-pane stage-pane">
      ${map}
      ${renderLegend(ctx)}
    </aside>`;
}
