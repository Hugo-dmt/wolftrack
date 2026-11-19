import { METRICS } from '../config/metrics.js';
import { createMetricControl } from '../components/metricControls.js';
import { addEntry } from '../services/store.js';
import { formatDateLabel, getTodayISO, getYesterdayISO } from '../utils/date.js';

export function renderManualView(container, { user, subject, targetDate, onDateChange, onToast }) {
  const savedMetrics = new Set();
  let activeSheetMetric = null;

  function render() {
    const today = getTodayISO();
    const yesterday = getYesterdayISO();

    container.innerHTML = `
      <div class="manual-view">
        <div class="manual-date-bar">
          <button type="button" class="pill-date-btn ${targetDate === today ? 'is-selected' : ''}" id="man-today">
            Aujourd'hui
          </button>
          <button type="button" class="pill-date-btn ${targetDate === yesterday ? 'is-selected' : ''}" id="man-yesterday">
            Hier
          </button>
          <label class="pill-date-btn ${targetDate !== today && targetDate !== yesterday ? 'is-selected' : ''}">
            <span>${targetDate !== today && targetDate !== yesterday ? formatDateLabel(targetDate) : 'Calendrier'}</span>
            <input type="date" id="man-custom-date" class="hidden-date-input" value="${targetDate}" max="${today}" />
          </label>
        </div>

        <div class="metric-grid" id="manual-metric-grid"></div>
      </div>

      <div class="sheet-backdrop ${activeSheetMetric ? 'is-open' : ''}" id="sheet-backdrop">
        <div class="bottom-sheet" id="bottom-sheet" role="dialog" aria-modal="true">
          <div class="sheet-handle"></div>
          <div id="sheet-content"></div>
        </div>
      </div>
    `;

    container.querySelector('#man-today').addEventListener('click', () => onDateChange(today));
    container.querySelector('#man-yesterday').addEventListener('click', () => onDateChange(yesterday));
    container.querySelector('#man-custom-date').addEventListener('change', (e) => {
      if (e.target.value) onDateChange(e.target.value);
    });

    const grid = container.querySelector('#manual-metric-grid');
    METRICS.forEach((metric) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = `metric-tile ${savedMetrics.has(metric.id) ? 'is-saved' : ''}`;
      tile.innerHTML = `
        <div class="tile-icon">${metric.icon}</div>
        <div class="tile-label">${metric.label}</div>
        ${savedMetrics.has(metric.id) ? '<span class="tile-saved-badge">Enregistré ✓</span>' : ''}
      `;
      tile.addEventListener('click', () => {
        activeSheetMetric = metric;
        openSheet(metric);
      });
      grid.appendChild(tile);
    });

    const backdrop = container.querySelector('#sheet-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeSheet();
      }
    });
  }

  function closeSheet() {
    activeSheetMetric = null;
    const backdrop = container.querySelector('#sheet-backdrop');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  function openSheet(metric) {
    const backdrop = container.querySelector('#sheet-backdrop');
    const sheetContent = container.querySelector('#sheet-content');
    if (!backdrop || !sheetContent) return;

    const isAutoSaveInstant = metric.type === 'scale' || metric.type === 'single';

    sheetContent.innerHTML = `
      <div class="sheet-header">
        <h3 class="sheet-title">${metric.question}</h3>
        <button type="button" class="sheet-close" id="sheet-close-btn" aria-label="Fermer">✕</button>
      </div>
      <div id="sheet-control-slot"></div>
      ${
        isAutoSaveInstant
          ? ''
          : `<div class="sheet-footer">
               <button type="button" class="btn-primary btn-xl" id="sheet-save-btn" disabled>Enregistrer</button>
             </div>`
      }
    `;

    sheetContent.querySelector('#sheet-close-btn').addEventListener('click', closeSheet);

    const slot = sheetContent.querySelector('#sheet-control-slot');
    const saveBtn = sheetContent.querySelector('#sheet-save-btn');
    let currentVal = null;
    let currentValid = false;

    async function commitSave(value) {
      try {
        await addEntry(user, {
          subjectId: subject.id,
          targetDate,
          sourceMode: 'manual',
          metric: metric.id,
          value,
        });
        savedMetrics.add(metric.id);
        closeSheet();
        render();
        onToast(`${metric.label} enregistré ✓`, 'success');
      } catch (err) {
        onToast(err.message || 'Erreur de sauvegarde', 'error');
      }
    }

    const control = createMetricControl(metric, {
      onChange: (val, valid) => {
        currentVal = val;
        currentValid = valid;
        if (saveBtn) saveBtn.disabled = !valid;
      },
      onInstantSelect: (val) => {
        if (isAutoSaveInstant) {
          setTimeout(() => commitSave(val), 120);
        }
      },
    });

    slot.appendChild(control.element);

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!currentValid) return;
        saveBtn.disabled = true;
        commitSave(currentVal);
      });
    }

    backdrop.classList.add('is-open');
  }

  render();
}
