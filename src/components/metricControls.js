/**
 * Contrôles tactiles réutilisables pour chacune des 11 métriques.
 * Utilisé à la fois dans Mode A (Session Express) et Mode B (Bottom Sheet Manuel).
 */

export function createMetricControl(metric, { onChange, onInstantSelect }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'metric-control-wrap';

  // État interne du contrôle
  let state = getInitialState(metric);

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

function getInitialState(metric) {
  switch (metric.type) {
    case 'multi_fourmillements':
      return { selected: [] };
    case 'scale':
    case 'single':
      return { value: null };
    case 'foot':
      return { type: null, intensity: null, duration: null };
    case 'double_scale':
      return { intensity: null, duration: null };
    case 'hours':
      return { hours: metric.defaultHours || 7.5, hachee: false };
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
    case 'hours':
      return {
        valid: Boolean(state.hours > 0),
        value: metric.hasHachee
          ? { hours: state.hours, hachee: Boolean(state.hachee) }
          : state.hours,
      };
    default:
      return { valid: false, value: null };
  }
}
