import { METRICS } from '../config/metrics.js';
import { createMetricControl } from '../components/metricControls.js';
import { addEntry, getCompletedDates } from '../services/store.js';
import { formatDateLabel, getTodayISO, getYesterdayISO, toLocalISODate } from '../utils/date.js';

export function renderSessionView(container, { user, subject, targetDate, onDateChange, onToast }) {
  // step: -1 = Écran 0 (Départ), 0..12 = Métriques 1..13, 13 = Écran final
  let step = -1;
  let isSaving = false;
  let completedDates = new Set();

  // Mois affiché dans le calendrier (basé sur targetDate)
  const [initY, initM] = targetDate.split('-').map(Number);
  let calYear = initY;
  let calMonth = initM - 1; // 0-indexed

  getCompletedDates(user, subject.id)
    .then((dates) => {
      completedDates = dates;
      if (step === -1) render();
    })
    .catch(() => {});

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
      completedDates.add(targetDate);
      step += 1;
      isSaving = false;
      render();
    } catch (err) {
      isSaving = false;
      onToast(err.message || 'Erreur de sauvegarde', 'error');
    }
  }

  function buildCalendarHtml() {
    const today = getTodayISO();
    const firstDay = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    // Lundi = 0 .. Dimanche = 6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const monthLabel = firstDay.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    let cells = '';
    for (let i = 0; i < startOffset; i++) {
      cells += `<span class="cal-cell cal-empty"></span>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toLocalISODate(new Date(calYear, calMonth, day));
      const isFuture = iso > today;
      const isSelected = iso === targetDate;
      const isDone = completedDates.has(iso);

      cells += `
        <button
          type="button"
          class="cal-cell cal-day ${isSelected ? 'is-selected' : ''} ${isDone ? 'is-done' : ''}"
          data-date="${iso}"
          ${isFuture ? 'disabled' : ''}
        >
          <span>${day}</span>
          ${isDone ? '<span class="cal-dot" aria-hidden="true"></span>' : ''}
        </button>
      `;
    }

    return `
      <div class="home-calendar">
        <div class="cal-header">
          <button type="button" class="cal-nav-btn" id="cal-prev" aria-label="Mois précédent">‹</button>
          <span class="cal-month-label">${monthLabel}</span>
          <button type="button" class="cal-nav-btn" id="cal-next" aria-label="Mois suivant">›</button>
        </div>
        <div class="cal-weekdays">
          <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
        </div>
        <div class="cal-grid">
          ${cells}
        </div>
      </div>
    `;
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
          <div class="date-quick-row">
            <button type="button" class="seg-btn ${targetDate === today ? 'is-selected' : ''}" id="sess-today">
              Aujourd'hui
            </button>
            <button type="button" class="seg-btn ${targetDate === yesterday ? 'is-selected' : ''}" id="sess-yesterday">
              Hier
            </button>
          </div>
          ${buildCalendarHtml()}
        </div>
        <div class="session-bottom-cta">
          <button type="button" class="btn-primary btn-xl" id="start-session-btn">
            Démarrer la session
          </button>
        </div>
      `;

      el.querySelector('#sess-today').addEventListener('click', () => onDateChange(today));
      el.querySelector('#sess-yesterday').addEventListener('click', () => onDateChange(yesterday));

      el.querySelector('#cal-prev').addEventListener('click', () => {
        calMonth -= 1;
        if (calMonth < 0) {
          calMonth = 11;
          calYear -= 1;
        }
        render();
      });

      el.querySelector('#cal-next').addEventListener('click', () => {
        calMonth += 1;
        if (calMonth > 11) {
          calMonth = 0;
          calYear += 1;
        }
        render();
      });

      el.querySelectorAll('.cal-day[data-date]').forEach((btn) => {
        btn.addEventListener('click', () => {
          onDateChange(btn.dataset.date);
        });
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

    // ÉCRANS 1 à 12
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
        ${
          metric.hasNope
            ? `<button type="button" class="btn-nope-inline" id="sess-nope-btn">Nope</button>`
            : ''
        }
      </div>

      <div class="session-thumb-actions">
        <button type="button" class="btn-skip btn-xl" id="sess-skip-btn">Passer</button>
        <button type="button" class="btn-next-green btn-xl" id="sess-next-btn" disabled>Suivant</button>
      </div>
    `;

    const slot = el.querySelector('#metric-control-slot');
    const nextBtn = el.querySelector('#sess-next-btn');
    const skipBtn = el.querySelector('#sess-skip-btn');
    const nopeBtn = el.querySelector('#sess-nope-btn');
    const backBtn = el.querySelector('#sess-back-btn');

    let currentValid = false;
    let currentValue = null;

    const control = createMetricControl(metric, {
      user,
      onChange: (val, valid) => {
        currentValue = val;
        currentValid = valid;
        nextBtn.disabled = !valid;
      },
      onInstantSelect: (val) => {
        currentValue = val;
        currentValid = true;
        nextBtn.disabled = false;
      },
    });

    slot.appendChild(control.element);

    backBtn.addEventListener('click', () => {
      step = step - 1;
      render();
    });

    if (nopeBtn) {
      nopeBtn.addEventListener('click', () => {
        saveAndAdvance(metric, 0);
      });
    }

    skipBtn.addEventListener('click', () => {
      saveAndAdvance(metric, null);
    });

    nextBtn.addEventListener('click', () => {
      if (!currentValid) return;
      saveAndAdvance(metric, currentValue);
    });

    container.appendChild(el);
  }

  render();
}
