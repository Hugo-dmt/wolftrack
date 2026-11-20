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
import {
  getReminderConfig,
  saveReminderConfig,
  requestNotificationPermission,
  sendWolftrackNotification,
  isNotificationSupported,
} from '../utils/notifications.js';

export function renderSettingsView(container, { user, subject, onClose, onLogout, onToast }) {
  const installed = isStandaloneInstalled();
  const fbConfigured = isFirebaseConfigured();
  const reminder = getReminderConfig();
  const notifSupported = isNotificationSupported();

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
          <div class="settings-label">Planifier les sessions</div>
          <div class="reminder-row">
            <input type="time" id="reminder-time-input" class="text-input reminder-time-input" value="${reminder.time || '20:30'}" />
            <button type="button" class="btn-primary reminder-save-btn" id="reminder-toggle-btn">
              ${reminder.enabled ? 'Mettre à jour' : 'Activer'}
            </button>
          </div>
          ${
            reminder.enabled
              ? `
            <div class="reminder-actions-row">
              <button type="button" class="btn-secondary" id="reminder-test-btn">Tester</button>
              <button type="button" class="btn-ghost" id="reminder-disable-btn">Désactiver</button>
            </div>
          `
              : ''
          }
          <p class="settings-hint">
            ${
              notifSupported
                ? 'Rappel quotidien à l’heure choisie (nécessite que l’app/navigateur reste actif en arrière-plan ; pour du push 100 % app fermée, un serveur FCM est requis).'
                : 'Notifications non supportées sur ce navigateur.'
            }
          </p>
        </section>

        <section class="settings-card">
          <button type="button" class="btn-primary btn-xl" id="export-json-btn">
            Exporter les données (JSON)
          </button>
          <p class="settings-hint">
            Télécharge l'historique complet horodaté (<code>wolftrack-export-${getTodayISO()}.json</code>).
          </p>
          <button type="button" class="btn-secondary btn-xl" id="copy-analysis-btn">
            Copier pour analyse
          </button>
          <p class="settings-hint">
            Collez le résultat dans votre IA favorite pour une analyse rapide.
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

  const reminderToggleBtn = container.querySelector('#reminder-toggle-btn');
  const reminderTimeInput = container.querySelector('#reminder-time-input');
  reminderToggleBtn.addEventListener('click', async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'unsupported') {
      onToast('Notifications non supportées sur ce navigateur', 'error');
      return;
    }
    if (perm !== 'granted') {
      onToast('Permission de notification refusée', 'error');
      return;
    }
    const time = reminderTimeInput.value || '20:30';
    saveReminderConfig({ enabled: true, time, lastNotifiedDate: null });
    onToast(`Rappel activé à ${time} ✓`, 'success');
    renderSettingsView(container, { user, subject, onClose, onLogout, onToast });
  });

  const testBtn = container.querySelector('#reminder-test-btn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const ok = await sendWolftrackNotification('Wolftrack', 'Test de rappel quotidien ✓');
      if (!ok) onToast('Impossible d’envoyer la notification', 'error');
    });
  }

  const disableBtn = container.querySelector('#reminder-disable-btn');
  if (disableBtn) {
    disableBtn.addEventListener('click', () => {
      saveReminderConfig({ ...reminder, enabled: false });
      onToast('Rappel désactivé', 'success');
      renderSettingsView(container, { user, subject, onClose, onLogout, onToast });
    });
  }

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

  const copyAnalysisBtn = container.querySelector('#copy-analysis-btn');
  copyAnalysisBtn.addEventListener('click', async () => {
    copyAnalysisBtn.disabled = true;
    try {
      const payload = await exportAllEntries(user, subject);
      const promptText = buildAnalysisPrompt(payload);
      await copyTextToClipboard(promptText);
      onToast(`Copié pour analyse (${payload.totalEntries} entrées) ✓`, 'success');
    } catch (err) {
      onToast(err.message || 'Impossible de copier dans le presse-papier', 'error');
    } finally {
      copyAnalysisBtn.disabled = false;
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

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) {
    throw new Error('Copie refusée par le navigateur.');
  }
}

function buildAnalysisPrompt(payload) {
  return `Tu es un biostatisticien et data scientist spécialisé en analyse exploratoire de séries temporelles de santé (suivi quotidien de symptômes et d'habitudes de vie, contexte sclérose en plaques).
Analyse le jeu de données JSON ci-dessous issu de l'application Wolftrack afin d'identifier des patterns, tendances et corrélations exploitables (sans poser de diagnostic médical).

### 1. Préparation & Nettoyage des données
- Chaque entrée possède \`targetDate\` (YYYY-MM-DD), \`createdAt\`, \`metric\` et \`value\`.
- Distingue strictement \`null\` (question passée / donnée manquante) de \`0\` (absence confirmée, ex. pas d'alcool, pas de sport, pas de courbatures).
- Si plusieurs saisies existent pour un même couple \`(targetDate, metric)\`, conserve la plus récente (\`createdAt\`) pour les états journaliers (\`etat_general\`, \`fatigue\`, etc.) ou agrège de façon cohérente les événements ponctuels.

### 2. Méthodes scientifiques attendues
1. **Statistiques descriptives** : médiane, écart interquartile (IQR), moyenne/écart-type et taux de complétion par métrique.
2. **Corrélations non paramétriques (même jour $t$)** : utilise le coefficient de corrélation de rang de **Spearman ($\\rho$)** (et/ou **Kendall $\\tau$**), adapté aux échelles ordinales (1–4, 1–5) et aux distributions non normales. Indique la taille de l'échantillon ($n$), la force de l'effet et la p-value si calculable.
3. **Effets décalés (Cross-correlation à $t+1$ et $t+2$ jours)** : teste l'impact des facteurs de la veille / avant-veille (sommeil \`sommeil_nuit\`, nuit hachée, alcool, buse, activité physique, charge mentale, travail) sur les symptômes des jours suivants (\`etat_general\`, \`fatigue\`, \`courbatures\`, \`fourmillements\`, \`autres_symptomes\`).
4. **Comparaisons de groupes** : utilise le test de **Mann–Whitney $U$** (avec taille d'effet $r$ rang-bisériale) pour les variables binaires ou catégorielles (ex. nuit hachée vs non hachée, \`autres_malades_maison\`, télétravail vs présentiel, présence d'activité physique vs repos).
5. **Rigueur & Biais** : signale les corrélations potentiellement fallacieuses liées au faible $n$ ou aux tests multiples (correction de Benjamini–Hochberg / FDR en esprit), ainsi que les facteurs de confusion possibles.

### 3. Format de réponse souhaité
- **Synthèse rapide (Top 3 à 5 patterns observés)** en langage clair.
- **Détail des corrélations & effets décalés ($t \\to t+1 / t+2$)** avec les métriques chiffrées.
- **Limites des données actuelles** (taille d'échantillon, données manquantes) et **pistes à surveiller** lors des prochains jours.

### Données JSON Wolftrack :
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``;
}
