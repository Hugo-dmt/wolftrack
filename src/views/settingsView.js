import { exportAllEntries } from '../services/store.js';
import { getTodayISO } from '../utils/date.js';
import {
  isStandaloneInstalled,
  triggerPWAInstall,
  getInstallFallbackMessage,
} from '../utils/pwa.js';
import {
  isFirebaseConfigured,
  saveRuntimeFirebaseConfig,
} from '../services/firebase.js';

export function renderSettingsView(container, { user, subject, onClose, onLogout, onToast }) {
  const installed = isStandaloneInstalled();
  const fbConfigured = isFirebaseConfigured();

  container.innerHTML = `
    <div class="settings-overlay">
      <div class="settings-header">
        <h2 class="settings-title">Paramètres</h2>
        <button type="button" class="icon-btn" id="settings-close-btn" aria-label="Fermer">✕</button>
      </div>

      <div class="settings-body">
        <section class="settings-card">
          <div class="settings-label">Profil tracké</div>
          <div class="settings-value-lg">${subject.pseudo}</div>
          <div class="invite-box">
            <div>
              <div class="settings-label">Code de partage</div>
              <div class="invite-code">${subject.inviteCode}</div>
            </div>
            <button type="button" class="btn-secondary" id="copy-code-btn">Copier le code</button>
          </div>
          <div class="settings-meta">
            Connecté en tant que : ${user.displayName || user.email || 'Utilisateur'}
            ${user.isLocal ? ' (Mode local)' : ' (Google / Cloud)'}
          </div>
        </section>

        <section class="settings-card">
          <button type="button" class="btn-primary btn-xl" id="export-json-btn">
            Exporter les données (JSON)
          </button>
          <p class="settings-hint">
            Télécharge l'historique complet horodaté (<code>wolftrack-export-${getTodayISO()}.json</code>).
          </p>
        </section>

        <section class="settings-card">
          <button type="button" class="btn-secondary btn-xl" id="pwa-install-btn">
            ${installed ? 'Application déjà installée ✓' : "Ajouter à l'écran d'accueil"}
          </button>
          <p class="settings-hint hidden" id="pwa-fallback-msg"></p>
        </section>

        ${
          !fbConfigured
            ? `
          <section class="settings-card">
            <button type="button" class="btn-ghost" id="settings-fb-toggle">
              Configurer Firebase (Sync Cloud)
            </button>
            <div id="settings-fb-panel" class="config-panel hidden">
              <textarea
                id="settings-fb-input"
                class="code-textarea"
                rows="5"
                placeholder='{"apiKey":"...","authDomain":"...","projectId":"..."}'
              ></textarea>
              <button type="button" class="btn-primary" id="settings-fb-save">Enregistrer</button>
            </div>
          </section>
        `
            : ''
        }

        <button type="button" class="btn-danger btn-xl" id="settings-logout-btn">
          Déconnexion
        </button>
      </div>
    </div>
  `;

  container.querySelector('#settings-close-btn').addEventListener('click', onClose);

  container.querySelector('#copy-code-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(subject.inviteCode);
      onToast('Code copié ✓', 'success');
    } catch {
      onToast(`Code : ${subject.inviteCode}`, 'success');
    }
  });

  const exportBtn = container.querySelector('#export-json-btn');
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    try {
      const payload = await exportAllEntries(user, subject);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wolftrack-export-${getTodayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast(`Exporté (${payload.totalEntries} entrées) ✓`, 'success');
    } catch (err) {
      onToast(err.message || "Erreur lors de l'export", 'error');
    } finally {
      exportBtn.disabled = false;
    }
  });

  const pwaBtn = container.querySelector('#pwa-install-btn');
  const pwaMsg = container.querySelector('#pwa-fallback-msg');
  pwaBtn.addEventListener('click', async () => {
    const res = await triggerPWAInstall();
    if (res.status === 'accepted') {
      onToast('Wolftrack installé ✓', 'success');
      pwaBtn.textContent = 'Application installée ✓';
    } else if (res.status === 'already_installed') {
      pwaMsg.textContent = 'Wolftrack est déjà installé sur cet appareil.';
      pwaMsg.classList.remove('hidden');
    } else if (res.status === 'unsupported') {
      pwaMsg.textContent = getInstallFallbackMessage();
      pwaMsg.classList.remove('hidden');
    }
  });

  const fbToggle = container.querySelector('#settings-fb-toggle');
  const fbPanel = container.querySelector('#settings-fb-panel');
  if (fbToggle && fbPanel) {
    fbToggle.addEventListener('click', () => fbPanel.classList.toggle('hidden'));
    container.querySelector('#settings-fb-save').addEventListener('click', async () => {
      try {
        const parsed = JSON.parse(container.querySelector('#settings-fb-input').value.trim());
        await saveRuntimeFirebaseConfig(parsed);
        onToast('Firebase configuré ✓ Déconnecte-toi pour te connecter avec Google.', 'success');
      } catch (err) {
        onToast('JSON invalide : ' + err.message, 'error');
      }
    });
  }

  container.querySelector('#settings-logout-btn').addEventListener('click', onLogout);
}
