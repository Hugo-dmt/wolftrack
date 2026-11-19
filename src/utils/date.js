/**
 * Utilitaires de date locale au format YYYY-MM-DD.
 */

export function toLocalISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayISO() {
  return toLocalISODate(new Date());
}

export function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalISODate(d);
}

export function formatDateLabel(isoDate) {
  const today = getTodayISO();
  const yesterday = getYesterdayISO();
  if (isoDate === today) return "Aujourd'hui";
  if (isoDate === yesterday) return 'Hier';

  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
