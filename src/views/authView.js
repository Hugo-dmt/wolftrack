import {
  isFirebaseConfigured,
  saveRuntimeFirebaseConfig,
  signInWithGoogle,
} from '../services/firebase.js';
import { createLocalSessionUser } from '../services/store.js';

export function renderAuthView(container, { onLocalLogin, onToast }) {
  const configured = isFirebaseConfigured();

  container.innerHTML = `
    <main class="auth-screen">
      <div class="auth-card">
        <img src="./wolf-icon.svg" alt="Wolftrack" class="auth-logo" />
        <h1 class="auth-title">Wolftrack</h1>
        <p class="auth-subtitle">Suivi quotidien ultrarapide des symptômes &amp; habitudes.</p>

        ${
          configured
            ? `
          <button type="button" class="btn-primary btn-xl" id="google-signin-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"/></svg>
            <span>Continuer avec Google</span>
          </button>
          <button type="button" class="btn-ghost" id="local-mode-btn">
            Mode local (hors-ligne)
          </button>
        `
            : `
          <button type="button" class="btn-primary btn-xl" id="local-mode-btn">
            Démarrer en mode local
          </button>
          <button type="button" class="btn-secondary btn-xl" id="config-firebase-btn">
            Connecter Firebase (Google)
          </button>
        `
        }

        <div id="firebase-config-panel" class="config-panel hidden">
          <label class="field-label" for="firebase-json-input">
            Coller le JSON <code>firebaseConfig</code> :
          </label>
          <textarea
            id="firebase-json-input"
            class="code-textarea"
            rows="6"
            placeholder='{"apiKey":"...","authDomain":"...","projectId":"..."}'
          ></textarea>
          <button type="button" class="btn-primary" id="save-firebase-btn">Enregistrer &amp; Activer</button>
        </div>
      </div>
    </main>
  `;

  const googleBtn = container.querySelector('#google-signin-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      try {
        await signInWithGoogle();
      } catch (err) {
        onToast(err.message || 'Erreur de connexion Google', 'error');
        googleBtn.disabled = false;
      }
    });
  }

  container.querySelector('#local-mode-btn').addEventListener('click', () => {
    const user = createLocalSessionUser('Moi');
    onLocalLogin(user);
  });

  const cfgBtn = container.querySelector('#config-firebase-btn');
  const cfgPanel = container.querySelector('#firebase-config-panel');
  if (cfgBtn && cfgPanel) {
    cfgBtn.addEventListener('click', () => {
      cfgPanel.classList.toggle('hidden');
    });
  }

  const saveCfgBtn = container.querySelector('#save-firebase-btn');
  if (saveCfgBtn) {
    saveCfgBtn.addEventListener('click', async () => {
      const raw = container.querySelector('#firebase-json-input').value.trim();
      try {
        const parsed = JSON.parse(raw);
        if (!parsed.apiKey || !parsed.projectId) {
          throw new Error('apiKey et projectId requis.');
        }
        await saveRuntimeFirebaseConfig(parsed);
        onToast('Firebase configuré ✓', 'success');
        renderAuthView(container, { onLocalLogin, onToast });
      } catch (err) {
        onToast('JSON invalide : ' + err.message, 'error');
      }
    });
  }
}
