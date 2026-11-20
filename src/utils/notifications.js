import { getTodayISO } from './date.js';

const REMINDER_KEY = 'wolftrack_daily_reminder_v1';
let schedulerTimer = null;

export function getReminderConfig() {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { enabled: false, time: '20:30', lastNotifiedDate: null };
}

export function saveReminderConfig(cfg) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(cfg));
}

export function isNotificationSupported() {
  return 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

export async function sendWolftrackNotification(
  title = 'Wolftrack',
  body = "C'est l'heure de ta session express !"
) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options = {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'wolftrack-daily-reminder',
    renotify: true,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn('Notification error:', err);
    return false;
  }
}

async function checkAndFireReminder() {
  const cfg = getReminderConfig();
  if (!cfg.enabled || !cfg.time) return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const today = getTodayISO();
  if (cfg.lastNotifiedDate === today) return;

  const now = new Date();
  const [targetH, targetM] = cfg.time.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetH * 60 + targetM;

  if (nowMinutes >= targetMinutes) {
    const sent = await sendWolftrackNotification();
    if (sent) {
      saveReminderConfig({ ...cfg, lastNotifiedDate: today });
    }
  }
}

export function startReminderScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  checkAndFireReminder();
  schedulerTimer = setInterval(checkAndFireReminder, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAndFireReminder();
    }
  });
}
