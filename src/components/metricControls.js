/**
 * Contrôles tactiles réutilisables pour chacune des 11 métriques.
 * Utilisé à la fois dans Mode A (Session Express) et Mode B (Bottom Sheet Manuel).
 */

const SYMPTOM_COLORS = [
  { bg: 'rgba(56, 189, 248, 0.18)', border: '#38BDF8', text: '#BAE6FD' },
  { bg: 'rgba(167, 139, 250, 0.18)', border: '#A78BFA', text: '#DDD6FE' },
  { bg: 'rgba(244, 114, 182, 0.18)', border: '#F472B6', text: '#FBCFE8' },
  { bg: 'rgba(251, 146, 60, 0.18)', border: '#FB923C', text: '#FED7AA' },
  { bg: 'rgba(52, 211, 153, 0.18)', border: '#34D399', text: '#A7F3D0' },
  { bg: 'rgba(250, 204, 21, 0.18)', border: '#FACC15', text: '#FEF08A' },
  { bg: 'rgba(248, 113, 113, 0.18)', border: '#F87171', text: '#FECACA' },
  { bg: 'rgba(45, 212, 191, 0.18)', border: '#2DD4BF', text: '#99F6E4' },
];

function randomSymptomColor() {
  return SYMPTOM_COLORS[Math.floor(Math.random() * SYMPTOM_COLORS.length)];
}

function getRecentKey(prefix, user) {
  return `wolftrack_recent_${prefix}_${user?.uid || 'local'}`;
}

function loadRecentTags(prefix, user) {
  try {
    const raw = localStorage.getItem(getRecentKey(prefix, user));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function pushRecentTag(prefix, user, label) {
  const clean = label.trim();
  if (!clean) return;
  const existing = loadRecentTags(prefix, user).filter(
    (item) => item.toLowerCase() !== clean.toLowerCase()
  );
  const updated = [clean, ...existing].slice(0, 8);
  try {
    localStorage.setItem(getRecentKey(prefix, user), JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
}

export function createMetricControl(metric, { user, initialValue, onChange, onInstantSelect }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'metric-control-wrap';

  // État interne du contrôle
  let state = getInitialState(metric, initialValue);

  function emit(isInstant = false) {
    const { valid, value } = evaluateState(metric, state);
    if (isInstant && valid && onInstantSelect) {
      onInstantSelect(value);
    } else if (onChange) {
      onChange(value, valid);
    }
  }

  function render() {
    wrapper.innerHTML = '';

    if (metric.type === 'multi_fourmillements') {
      const list = document.createElement('div');
      list.className = 'option-stack';

      metric.options.forEach((opt) => {
        const isSelected = state.selected.includes(opt.value);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `choice-btn ${isSelected ? 'is-selected' : ''}`;
        btn.innerHTML = `
          <span>${opt.label}</span>
          <span class="choice-check">${isSelected ? '✓' : ''}</span>
        `;
        btn.addEventListener('click', () => {
          if (opt.exclusive) {
            state.selected = isSelected ? [] : ['aucun'];
          } else {
            const withoutAucun = state.selected.filter((v) => v !== 'aucun');
            if (withoutAucun.includes(opt.value)) {
              state.selected = withoutAucun.filter((v) => v !== opt.value);
            } else {
              state.selected = [...withoutAucun, opt.value];
            }
          }
          render();
          emit(false);
        });
        list.appendChild(btn);
      });

      wrapper.appendChild(list);
    } else if (metric.type === 'scale') {
      const maxScale = metric.maxScale || 4;
      const grid = document.createElement('div');
      grid.className = `scale-grid ${maxScale === 5 ? 'scale-grid-5' : ''}`;

      for (let num = 1; num <= maxScale; num++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `scale-btn ${state.value === num ? 'is-selected' : ''}`;
        btn.textContent = String(num);
        btn.addEventListener('click', () => {
          state.value = num;
          render();
          emit(true);
        });
        grid.appendChild(btn);
      }

      const hints = document.createElement('div');
      hints.className = 'scale-hints';
      hints.innerHTML = `<span>1 · ${metric.minLabel}</span><span>${maxScale} · ${metric.maxLabel}</span>`;

      wrapper.appendChild(grid);
      wrapper.appendChild(hints);
    } else if (metric.type === 'single') {
      const stack = document.createElement('div');
      stack.className = 'option-stack';

      metric.options.forEach((opt) => {
        const isSelected = state.value === opt.value;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `choice-btn ${isSelected ? 'is-selected' : ''}`;
        btn.innerHTML = `
          <span>${opt.label}</span>
          <span class="choice-check">${isSelected ? '✓' : ''}</span>
        `;
        btn.addEventListener('click', () => {
          state.value = opt.value;
          render();
          emit(true);
        });
        stack.appendChild(btn);
      });

      wrapper.appendChild(stack);
    } else if (metric.type === 'foot') {
      // Type: Match / Entraînement
      const typeGroup = document.createElement('div');
      typeGroup.className = 'compound-group';
      typeGroup.innerHTML = `<div class="group-label">Type</div>`;
      const typeRow = document.createElement('div');
      typeRow.className = 'segmented-row';

      metric.types.forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `seg-btn ${state.type === t.value ? 'is-selected' : ''}`;
        btn.textContent = t.label;
        btn.addEventListener('click', () => {
          state.type = t.value;
          render();
          emit(false);
        });
        typeRow.appendChild(btn);
      });
      typeGroup.appendChild(typeRow);
      wrapper.appendChild(typeGroup);

      wrapper.appendChild(buildScaleRow('Intensité', state.intensity, (val) => {
        state.intensity = val;
        render();
        emit(false);
      }));

      wrapper.appendChild(buildScaleRow('Durée', state.duration, (val) => {
        state.duration = val;
        render();
        emit(false);
      }));
    } else if (metric.type === 'double_scale') {
      wrapper.appendChild(buildScaleRow('Intensité', state.intensity, (val) => {
        state.intensity = val;
        render();
        emit(false);
      }));

      wrapper.appendChild(buildScaleRow('Durée', state.duration, (val) => {
        state.duration = val;
        render();
        emit(false);
      }));
    } else if (metric.type === 'hours') {
      // Stepper -0.5h / +0.5h
      const stepper = document.createElement('div');
      stepper.className = 'sleep-stepper';

      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'stepper-btn';
      minusBtn.textContent = '− 0.5h';
      minusBtn.addEventListener('click', () => {
        state.hours = Math.max(0.5, Math.round((state.hours - 0.5) * 10) / 10);
        render();
        emit(false);
      });

      const readout = document.createElement('div');
      readout.className = 'sleep-readout';
      readout.textContent = `${state.hours} h`;

      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'stepper-btn';
      plusBtn.textContent = '+ 0.5h';
      plusBtn.addEventListener('click', () => {
        state.hours = Math.min(16, Math.round((state.hours + 0.5) * 10) / 10);
        render();
        emit(false);
      });

      stepper.appendChild(minusBtn);
      stepper.appendChild(readout);
      stepper.appendChild(plusBtn);
      wrapper.appendChild(stepper);

      // Quick pills
      const presets = metric.presets || [5, 6, 7, 7.5, 8, 9];
      const pills = document.createElement('div');
      pills.className = 'preset-pills';
      presets.forEach((h) => {
        const p = document.createElement('button');
        p.type = 'button';
        p.className = `pill-btn ${state.hours === h ? 'is-selected' : ''}`;
        p.textContent = `${h}h`;
        p.addEventListener('click', () => {
          state.hours = h;
          render();
          emit(false);
        });
        pills.appendChild(p);
      });
      wrapper.appendChild(pills);

      if (metric.hasHachee) {
        const hacheeBtn = document.createElement('button');
        hacheeBtn.type = 'button';
        hacheeBtn.role = 'checkbox';
        hacheeBtn.setAttribute('aria-checked', String(state.hachee));
        hacheeBtn.className = `choice-btn hachee-toggle ${state.hachee ? 'is-selected' : ''}`;
        hacheeBtn.innerHTML = `
          <span>Hachée</span>
          <span class="checkbox-box">${state.hachee ? '✓' : ''}</span>
        `;
        hacheeBtn.addEventListener('click', () => {
          state.hachee = !state.hachee;
          render();
          emit(false);
        });
        wrapper.appendChild(hacheeBtn);
      }
    } else if (metric.type === 'free_symptoms') {
      appendFreeTagControl(wrapper, {
        user,
        prefix: 'symptoms',
        placeholder: 'Ex: Maux de tête...',
        items: state.items,
        onMutate: () => {
          render();
          emit(false);
        },
      });
    } else if (metric.type === 'sick_household') {
      const ynRow = document.createElement('div');
      ynRow.className = 'segmented-row';

      [
        { value: true, label: 'Oui' },
        { value: false, label: 'Non' },
      ].forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `seg-btn ${state.present === opt.value ? 'is-selected' : ''}`;
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          state.present = opt.value;
          render();
          emit(false);
        });
        ynRow.appendChild(btn);
      });

      wrapper.appendChild(ynRow);

      if (state.present === true) {
        const label = document.createElement('div');
        label.className = 'group-label';
        label.textContent = 'Maladie';
        wrapper.appendChild(label);

        appendFreeTagControl(wrapper, {
          user,
          prefix: 'illnesses',
          placeholder: 'Ex: Grippe, Rhume...',
          items: state.items,
          onMutate: () => {
            render();
            emit(false);
          },
        });
      }
    } else if (metric.type === 'other_activity') {
      wrapper.appendChild(buildScaleRow('Intensité', state.intensity, (val) => {
        state.intensity = val;
        render();
        emit(false);
      }));

      wrapper.appendChild(buildScaleRow('Durée', state.duration, (val) => {
        state.duration = val;
        render();
        emit(false);
      }));

      if (state.intensity !== null) {
        const label = document.createElement('div');
        label.className = 'group-label';
        label.textContent = 'Activité';
        wrapper.appendChild(label);

        appendFreeTagControl(wrapper, {
          user,
          prefix: 'activities',
          placeholder: 'Ex: Vélo, Natation...',
          items: state.items,
          onMutate: () => {
            render();
            emit(false);
          },
        });
      }
    }
  }

  render();
  // Émettre l'état initial (utile pour Nuit / Sieste qui ont une valeur par défaut)
  setTimeout(() => emit(false), 0);

  return {
    element: wrapper,
    getValue: () => evaluateState(metric, state),
  };
}

function appendFreeTagControl(container, { user, prefix, placeholder, items, onMutate }) {
  const form = document.createElement('form');
  form.className = 'symptom-input-row';
  form.innerHTML = `
    <input
      type="text"
      class="text-input symptom-text-input"
      placeholder="${placeholder}"
      autocomplete="off"
    />
    <button type="submit" class="symptom-add-btn">Ajouter</button>
  `;

  const input = form.querySelector('input');

  function addTag(text) {
    const clean = text.trim();
    if (!clean) return;
    const already = items.some((i) => i.text.toLowerCase() === clean.toLowerCase());
    if (!already) {
      items.push({ text: clean, color: randomSymptomColor() });
    }
    pushRecentTag(prefix, user, clean);
    onMutate();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTag(input.value);
  });

  container.appendChild(form);

  if (items.length > 0) {
    const selectedWrap = document.createElement('div');
    selectedWrap.className = 'symptom-bubbles';
    items.forEach((item, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'symptom-bubble';
      chip.style.background = item.color.bg;
      chip.style.borderColor = item.color.border;
      chip.style.color = item.color.text;
      chip.innerHTML = `<span>${item.text}</span><span class="bubble-x">×</span>`;
      chip.addEventListener('click', () => {
        items.splice(idx, 1);
        onMutate();
      });
      selectedWrap.appendChild(chip);
    });
    container.appendChild(selectedWrap);
  }

  const selectedLower = new Set(items.map((i) => i.text.toLowerCase()));
  const recent = loadRecentTags(prefix, user).filter(
    (label) => !selectedLower.has(label.toLowerCase())
  );

  if (recent.length > 0) {
    const recentSection = document.createElement('div');
    recentSection.className = 'recent-symptoms-section';
    recentSection.innerHTML = `<div class="group-label">Récents</div>`;
    const recentWrap = document.createElement('div');
    recentWrap.className = 'symptom-bubbles';
    recent.forEach((label) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'symptom-bubble symptom-bubble-grey';
      chip.textContent = label;
      chip.addEventListener('click', () => addTag(label));
      recentWrap.appendChild(chip);
    });
    recentSection.appendChild(recentWrap);
    container.appendChild(recentSection);
  }
}

function buildScaleRow(label, currentVal, onSelect) {
  const group = document.createElement('div');
  group.className = 'compound-group';
  group.innerHTML = `<div class="group-label">${label}</div>`;
  const grid = document.createElement('div');
  grid.className = 'scale-grid scale-grid-compact';

  [1, 2, 3, 4].forEach((num) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `scale-btn ${currentVal === num ? 'is-selected' : ''}`;
    btn.textContent = String(num);
    btn.addEventListener('click', () => onSelect(num));
    grid.appendChild(btn);
  });

  group.appendChild(grid);
  return group;
}

function getInitialState(metric, initialValue) {
  switch (metric.type) {
    case 'multi_fourmillements':
      if (Array.isArray(initialValue)) {
        return { selected: initialValue.length === 0 ? ['aucun'] : [...initialValue] };
      }
      return { selected: [] };
    case 'scale':
      return {
        value: typeof initialValue === 'number' && initialValue > 0 ? initialValue : null,
      };
    case 'single':
      return { value: initialValue !== undefined && initialValue !== null ? initialValue : null };
    case 'foot':
      if (initialValue && typeof initialValue === 'object') {
        return {
          type: initialValue.type || null,
          intensity: initialValue.intensity || null,
          duration: initialValue.duration || null,
        };
      }
      return { type: null, intensity: null, duration: null };
    case 'double_scale':
      if (initialValue && typeof initialValue === 'object') {
        return {
          intensity: initialValue.intensity || null,
          duration: initialValue.duration || null,
        };
      }
      return { intensity: null, duration: null };
    case 'other_activity':
      if (initialValue && typeof initialValue === 'object') {
        return {
          intensity: initialValue.intensity || null,
          duration: initialValue.duration || null,
          items: Array.isArray(initialValue.activites)
            ? initialValue.activites.map((t) => ({ text: t, color: randomSymptomColor() }))
            : [],
        };
      }
      return { intensity: null, duration: null, items: [] };
    case 'hours':
      if (initialValue && typeof initialValue === 'object' && initialValue.hours > 0) {
        return { hours: initialValue.hours, hachee: Boolean(initialValue.hachee) };
      }
      if (typeof initialValue === 'number' && initialValue > 0) {
        return { hours: initialValue, hachee: false };
      }
      return { hours: metric.defaultHours || 7.5, hachee: false };
    case 'free_symptoms':
      return {
        items: Array.isArray(initialValue)
          ? initialValue.map((t) => ({ text: t, color: randomSymptomColor() }))
          : [],
      };
    case 'sick_household':
      if (initialValue === false) {
        return { present: false, items: [] };
      }
      if (initialValue && typeof initialValue === 'object') {
        return {
          present: Boolean(initialValue.present),
          items: Array.isArray(initialValue.maladies)
            ? initialValue.maladies.map((t) => ({ text: t, color: randomSymptomColor() }))
            : [],
        };
      }
      return { present: null, items: [] };
    default:
      return {};
  }
}

function evaluateState(metric, state) {
  switch (metric.type) {
    case 'multi_fourmillements': {
      if (state.selected.length === 0) return { valid: false, value: null };
      if (state.selected.includes('aucun')) return { valid: true, value: [] };
      return { valid: true, value: [...state.selected] };
    }
    case 'scale':
    case 'single':
      return { valid: state.value !== null, value: state.value };
    case 'foot': {
      const valid = Boolean(state.type && state.intensity && state.duration);
      return {
        valid,
        value: valid
          ? { type: state.type, intensity: state.intensity, duration: state.duration }
          : null,
      };
    }
    case 'double_scale': {
      const valid = Boolean(state.intensity && state.duration);
      return {
        valid,
        value: valid ? { intensity: state.intensity, duration: state.duration } : null,
      };
    }
    case 'other_activity': {
      const valid = Boolean(state.intensity && state.duration);
      return {
        valid,
        value: valid
          ? {
              intensity: state.intensity,
              duration: state.duration,
              activites: state.items.map((i) => i.text),
            }
          : null,
      };
    }
    case 'hours':
      return {
        valid: Boolean(state.hours > 0),
        value: metric.hasHachee
          ? { hours: state.hours, hachee: Boolean(state.hachee) }
          : state.hours,
      };
    case 'free_symptoms':
      return {
        valid: state.items.length > 0,
        value: state.items.map((i) => i.text),
      };
    case 'sick_household':
      if (state.present === null) return { valid: false, value: null };
      if (state.present === false) return { valid: true, value: false };
      return {
        valid: true,
        value: { present: true, maladies: state.items.map((i) => i.text) },
      };
    default:
      return { valid: false, value: null };
  }
}
