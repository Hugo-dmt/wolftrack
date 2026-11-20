import './styles/main.css';
import { initPWAInstallListener } from './utils/pwa.js';
import { getTodayISO } from './utils/date.js';
import {
  initFirebaseIfPossible,
  onFirebaseAuthChanged,
  signOutFirebase,
} from './services/firebase.js';
import {
  getLocalUser,
  clearLocalSessionUser,
  getOrCreateUserProfile,
  getSubject,
} from './services/store.js';
import { renderHeader } from './components/header.js';
import { renderAuthView } from './views/authView.js';
import { renderOnboardingView } from './views/onboardingView.js';
import { renderSessionView } from './views/sessionView.js';
import { renderManualView } from './views/manualView.js';
import { renderSettingsView } from './views/settingsView.js';
import { startReminderScheduler } from './utils/notifications.js';

initPWAInstallListener();
startReminderScheduler();

const appRoot = document.getElementById('app');

const state = {
  loading: true,
  user: null,
  subject: null,
  mode: 'session', // 'session' | 'manual'
  targetDate: getTodayISO(),
  settingsOpen: false,
};

let toastTimer = null;

function showToast(message, type = 'success') {
  let toast = document.getElementById('wolftrack-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wolftrack-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} is-visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2400);
}

async function handleUserAuthenticated(user) {
  state.loading = true;
  state.user = user;
  render();

  try {
    const profile = await getOrCreateUserProfile(user);
    if (profile.activeSubjectId) {
      state.subject = await getSubject(user, profile.activeSubjectId);
    } else {
      state.subject = null;
    }
  } catch (err) {
    showToast(err.message || 'Erreur de chargement du profil', 'error');
    state.subject = null;
  } finally {
    state.loading = false;
    render();
  }
}

async function handleLogout() {
  state.settingsOpen = false;
  if (state.user?.isLocal) {
    clearLocalSessionUser();
  } else {
    await signOutFirebase();
  }
  state.user = null;
  state.subject = null;
  render();
}

function render() {
  if (state.loading) {
    appRoot.innerHTML = `
      <div class="loading-screen">
        <img src="./wolf-icon.svg" alt="Wolftrack" class="loading-logo" />
      </div>
    `;
    return;
  }

  if (!state.user) {
    renderAuthView(appRoot, {
      onLocalLogin: (localUser) => handleUserAuthenticated(localUser),
      onToast: showToast,
    });
    return;
  }

  if (!state.subject) {
    renderOnboardingView(appRoot, {
      user: state.user,
      onComplete: (subject) => {
        state.subject = subject;
        render();
      },
      onLogout: handleLogout,
      onToast: showToast,
    });
    return;
  }

  // Application principale (Mode A ou Mode B)
  appRoot.innerHTML = `
    <div class="app-shell ${state.mode === 'session' ? 'shell-fixed' : ''}">
      <div id="header-slot"></div>
      <nav class="mode-switch" aria-label="Mode de saisie">
        <button type="button" class="mode-tab ${state.mode === 'session' ? 'is-active' : ''}" id="mode-session-btn">
          Session Express
        </button>
        <button type="button" class="mode-tab ${state.mode === 'manual' ? 'is-active' : ''}" id="mode-manual-btn">
          Saisie Rapide
        </button>
      </nav>
      <main id="main-slot" class="main-slot"></main>
      <div id="settings-slot"></div>
    </div>
  `;

  renderHeader(appRoot.querySelector('#header-slot'), {
    targetDate: state.targetDate,
    onDateChange: (newDate) => {
      state.targetDate = newDate;
      render();
    },
    onOpenSettings: () => {
      state.settingsOpen = true;
      renderSettingsSlot();
    },
    showDatePicker: true,
  });

  appRoot.querySelector('#mode-session-btn').addEventListener('click', () => {
    if (state.mode !== 'session') {
      state.mode = 'session';
      render();
    }
  });

  appRoot.querySelector('#mode-manual-btn').addEventListener('click', () => {
    if (state.mode !== 'manual') {
      state.mode = 'manual';
      render();
    }
  });

  const mainSlot = appRoot.querySelector('#main-slot');
  if (state.mode === 'session') {
    renderSessionView(mainSlot, {
      user: state.user,
      subject: state.subject,
      targetDate: state.targetDate,
      onDateChange: (newDate) => {
        state.targetDate = newDate;
        render();
      },
      onToast: showToast,
    });
  } else {
    renderManualView(mainSlot, {
      user: state.user,
      subject: state.subject,
      targetDate: state.targetDate,
      onDateChange: (newDate) => {
        state.targetDate = newDate;
        render();
      },
      onToast: showToast,
    });
  }

  if (state.settingsOpen) {
    renderSettingsSlot();
  }
}

function renderSettingsSlot() {
  const slot = appRoot.querySelector('#settings-slot');
  if (!slot) return;
  renderSettingsView(slot, {
    user: state.user,
    subject: state.subject,
    onClose: () => {
      state.settingsOpen = false;
      slot.innerHTML = '';
    },
    onLogout: handleLogout,
    onToast: showToast,
  });
}

// Bootstrap Auth
function bootstrap() {
  const fb = initFirebaseIfPossible();
  const localUser = getLocalUser();

  if (fb) {
    onFirebaseAuthChanged((fbUser) => {
      if (fbUser) {
        handleUserAuthenticated(fbUser);
      } else if (localUser) {
        handleUserAuthenticated(localUser);
      } else {
        state.loading = false;
        state.user = null;
        render();
      }
    });
  } else if (localUser) {
    handleUserAuthenticated(localUser);
  } else {
    state.loading = false;
    render();
  }
}

bootstrap();
