import { formatDateLabel, getTodayISO, getYesterdayISO } from '../utils/date.js';

export function renderHeader(container, { targetDate, onDateChange, onOpenSettings, showDatePicker = true }) {
  container.innerHTML = `
    <header class="app-header">
      <div class="header-brand">
        <img src="./wolf-icon.svg" alt="Wolftrack" class="header-logo" />
        <span class="header-title">Wolftrack</span>
      </div>
      <div class="header-actions">
        ${
          showDatePicker
            ? `
          <button type="button" class="date-pill" id="header-date-btn" aria-label="Changer la date">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span id="header-date-label">${formatDateLabel(targetDate)}</span>
            <input type="date" id="header-date-input" class="hidden-date-input" value="${targetDate}" max="${getTodayISO()}" />
          </button>
        `
            : ''
        }
        <button type="button" class="icon-btn" id="header-settings-btn" aria-label="Paramètres">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </header>
  `;

  if (showDatePicker) {
    const dateBtn = container.querySelector('#header-date-btn');
    const dateInput = container.querySelector('#header-date-input');
    dateBtn.addEventListener('click', () => {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.focus();
        dateInput.click();
      }
    });
    dateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        onDateChange(e.target.value);
      }
    });
  }

  container.querySelector('#header-settings-btn').addEventListener('click', onOpenSettings);
}
