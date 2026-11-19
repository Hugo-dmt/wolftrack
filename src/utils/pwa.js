/**
 * Gestion de l'installation PWA (beforeinstallprompt + fallback iOS / déjà installé).
 */

let deferredPrompt = null;
const listeners = new Set();

export function initPWAInstallListener() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

function notify() {
  listeners.forEach((cb) => cb());
}

export function onPWAStateChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isStandaloneInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export async function triggerPWAInstall() {
  if (isStandaloneInstalled()) {
    return { status: 'already_installed' };
  }
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return { status: outcome === 'accepted' ? 'accepted' : 'dismissed' };
  }
  return { status: 'unsupported' };
}

export function getInstallFallbackMessage() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return "Sur iOS Safari : touche l'icône Partager (en bas) puis « Sur l'écran d'accueil ».";
  }
  if (/android/.test(ua)) {
    return "Sur Android Chrome : ouvre le menu ⋮ en haut à droite puis « Ajouter à l'écran d'accueil ».";
  }
  return "Utilise le menu de ton navigateur (« Installer l'application » ou « Ajouter à l'écran d'accueil »).";
}
