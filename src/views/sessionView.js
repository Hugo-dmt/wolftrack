import { METRICS } from '../config/metrics.js';
import { createMetricControl } from '../components/metricControls.js';
import { addEntry } from '../services/store.js';
import { formatDateLabel, getTodayISO, getYesterdayISO } from '../utils/date.js';

export function renderSessionView(container, { user, subject, targetDate, onDateChange, onToast }) {
  // step: -1 = Écran 0 (Départ), 0..10 = Métriques 1..11, 11 = Écran final
  let step = -1;
  let isSaving = false;

  async function saveAndAdvance(metric, value) {
    if (isSaving) return;
    isSaving = true;
    try {
      await addEntry(user, {
        subjectId: subject.id,
        targetDate,
        sourceMode: 'session',
        metric: metric.id,
        value,
      });
      step += 1;
      isSaving = false;
      render();
    } catch (err) {
      isSaving = false;
      onToast(err.message || 'Erreur de sauvegarde', 'error');
    }
  }

  function render() {
    container.innerHTML = '';

    // ÉCRAN 0 : Départ
    if (step === -1) {
      const today = getTodayISO();
      const yesterday = getYesterdayISO();

      const el = document.createElement('div');
      el.className = 'session-stage';
      el.innerHTML = `
        <div class="session-start-card">
          <div class="session-badge">Session Express · 11 questions</div>
          <h2 class="session-start-title">Date de la session</h2>
          <div class="date-quick-row">
            <button type="button" class="seg-btn ${targetDate === today ? 'is-selected' : ''}" id="sess-today">
              Aujourd'hui
            </button>
            <button type="button" class="seg-btn ${targetDate === yesterday ? 'is-selected' : ''}" id="sess-yesterday">
              Hier
            </button>
            <label class="seg-btn date-custom-btn ${targetDate !== today && targetDate !== yesterday ? 'is-selected' : ''}">
              <span>${targetDate !== today && targetDate !== yesterday ? formatDateLabel(targetDate) : 'Autre'}</span>
              <input type="date" id="sess-custom-date" class="hidden-date-input" value="${targetDate}" max="${today}" />
            </label>
          </div>
        </div>
        <div class="session-bottom-cta">
          <button type="button" class="btn-primary btn-xl" id="start-session-btn">
            Démarrer la session
          </button>
        </div>
      `;

      el.querySelector('#sess-today').addEventListener('click', () => onDateChange(today));
      el.querySelector('#sess-yesterday').addEventListener('click', () => onDateChange(yesterday));
      el.querySelector('#sess-custom-date').addEventListener('change', (e) => {
        if (e.target.value) onDateChange(e.target.value);
      });
      el.querySelector('#start-session-btn').addEventListener('click', () => {
        step = 0;
        render();
      });

      container.appendChild(el);
      return;
    }

    // ÉCRAN FINAL
    if (step >= METRICS.length) {
      const el = document.createElement('div');
      el.className = 'session-stage session-done-stage';
      el.innerHTML = `
        <div class="done-card">
          <div class="done-check">✓</div>
          <h2 class="done-title">Session enregistrée</h2>
          <p class="done-subtitle">${formatDateLabel(targetDate)} · ${subject.pseudo}</p>
        </div>
        <div class="session-bottom-cta">
          <button type="button" class="btn-primary btn-xl" id="done-home-btn">
            Retour à l'accueil
          </button>
        </div>
      `;
      el.querySelector('#done-home-btn').addEventListener('click', () => {
        step = -1;
        render();
      });
      container.appendChild(el);
      return;
    }

    // ÉCRANS 1 à 11
    const metric = METRICS[step];
    const progressPct = ((step + 1) / METRICS.length) * 100;

    const el = document.createElement('div');
    el.className = 'session-stage';
    el.innerHTML = `
      <div class="session-top">
        <div class="progress-track">
          <div class="progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="session-meta-row">
          <button type="button" class="btn-back" id="sess-back-btn">← Retour</button>
          <span class="session-counter">${step + 1} / ${METRICS.length}</span>
        </div>
      </div>

      <div class="session-question-body">
        <h2 class="question-title">${metric.question}</h2>
        <div id="metric-control-slot"></div>
      </div>

      <div class="session-thumb-actions">
        <button type="button" class="btn-secondary btn-xl" id="sess-nope-btn">Nope</button>
        <button type="button" class="btn-primary btn-xl" id="sess-next-btn" disabled>Suivant</button>
      </div>
    `;

    const slot = el.querySelector('#metric-control-slot');
    const nextBtn = el.querySelector('#sess-next-btn');
    const nopeBtn = el.querySelector('#sess-nope-btn');
    const backBtn = el.querySelector('#sess-back-btn');

    let currentValid = false;
    let currentValue = null;

    const control = createMetricControl(metric, {
      onChange: (val, valid) => {
        currentValue = val;
        currentValid = valid;
        nextBtn.disabled = !valid;
      },
      onInstantSelect: (val) => {
        currentValue = val;
        currentValid = true;
        nextBtn.disabled = false;
        if (metric.autoAdvance) {
          setTimeout(() => saveAndAdvance(metric, val), 150);
        }
      },
    });

    slot.appendChild(control.element);

    backBtn.addEventListener('click', () => {
      step = step - 1;
      render();
    });

    nopeBtn.addEventListener('click', () => {
      saveAndAdvance(metric, metric.nopeValue);
    });

    nextBtn.addEventListener('click', () => {
      if (!currentValid) return;
      saveAndAdvance(metric, currentValue);
    });

    container.appendChild(el);
  }

  render();
}
