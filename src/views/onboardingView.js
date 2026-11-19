import { createSubject, joinSubjectByCode } from '../services/store.js';

export function renderOnboardingView(container, { user, onComplete, onLogout, onToast }) {
  let activeTab = 'create';

  function render() {
    container.innerHTML = `
      <main class="onboarding-screen">
        <div class="onboarding-card">
          <div class="onboarding-top">
            <img src="./wolf-icon.svg" alt="Wolftrack" class="auth-logo-sm" />
            <button type="button" class="btn-text" id="onboard-logout-btn">Déconnexion</button>
          </div>
          <h1 class="onboarding-title">Profil de suivi</h1>
          <p class="onboarding-subtitle">Crée un profil ou rejoins celui de ton partenaire avec son code.</p>

          <div class="segmented-row">
            <button type="button" class="seg-btn ${activeTab === 'create' ? 'is-selected' : ''}" id="tab-create">
              Créer un profil
            </button>
            <button type="button" class="seg-btn ${activeTab === 'join' ? 'is-selected' : ''}" id="tab-join">
              Rejoindre
            </button>
          </div>

          ${
            activeTab === 'create'
              ? `
            <form id="create-form" class="onboarding-form">
              <label class="field-label" for="pseudo-input">Pseudo du profil tracké</label>
              <input
                id="pseudo-input"
                type="text"
                class="text-input"
                placeholder="Ex: Alex"
                autocomplete="off"
                required
              />
              <button type="submit" class="btn-primary btn-xl">Créer le profil</button>
            </form>
          `
              : `
            <form id="join-form" class="onboarding-form">
              <label class="field-label" for="code-input">Code de partage</label>
              <input
                id="code-input"
                type="text"
                class="text-input text-input-code"
                placeholder="Ex: WOLF-8492"
                autocomplete="off"
                required
              />
              <button type="submit" class="btn-primary btn-xl">Rejoindre le profil</button>
            </form>
          `
          }
        </div>
      </main>
    `;

    container.querySelector('#tab-create').addEventListener('click', () => {
      activeTab = 'create';
      render();
    });
    container.querySelector('#tab-join').addEventListener('click', () => {
      activeTab = 'join';
      render();
    });
    container.querySelector('#onboard-logout-btn').addEventListener('click', onLogout);

    const createForm = container.querySelector('#create-form');
    if (createForm) {
      createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pseudo = container.querySelector('#pseudo-input').value;
        const btn = createForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          const subject = await createSubject(user, pseudo);
          onComplete(subject);
        } catch (err) {
          onToast(err.message || 'Erreur lors de la création', 'error');
          btn.disabled = false;
        }
      });
    }

    const joinForm = container.querySelector('#join-form');
    if (joinForm) {
      joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = container.querySelector('#code-input').value;
        const btn = joinForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          const subject = await joinSubjectByCode(user, code);
          onComplete(subject);
        } catch (err) {
          onToast(err.message || 'Code introuvable', 'error');
          btn.disabled = false;
        }
      });
    }
  }

  render();
}
