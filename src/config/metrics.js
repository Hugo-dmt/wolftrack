/**
 * Configuration centralisée des 11 métriques Wolftrack.
 * Ordre exact utilisé pour la Session Express (1 à 11) et la grille Saisie Rapide.
 */

export const METRICS = [
  // --- SYMPTÔMES ---
  {
    id: 'fourmillements',
    category: 'symptomes',
    label: 'Fourmillements',
    question: 'Fourmillements ?',
    type: 'multi_fourmillements',
    nopeValue: [],
    options: [
      { value: 'superieurs', label: 'Membres supérieurs' },
      { value: 'inferieurs', label: 'Membres inférieurs' },
      { value: 'aucun', label: 'Aucun', exclusive: true },
    ],
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  {
    id: 'fatigue',
    category: 'symptomes',
    label: 'Fatigue',
    question: 'Niveau de fatigue ?',
    type: 'scale',
    minLabel: 'En forme',
    maxLabel: 'Épuisé',
    nopeValue: null,
    autoAdvance: true,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="11" x2="6" y2="13"/></svg>`,
  },
  {
    id: 'courbatures',
    category: 'symptomes',
    label: 'Courbatures',
    question: 'Courbatures ?',
    type: 'scale',
    minLabel: 'Légères',
    maxLabel: 'Intenses',
    nopeValue: null,
    autoAdvance: true,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2"/><path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
  },

  // --- HABITUDES & ACTIVITÉS ---
  {
    id: 'travail',
    category: 'habitudes',
    label: 'Travail',
    question: 'Mode de travail ?',
    type: 'single',
    nopeValue: null,
    autoAdvance: true,
    options: [
      { value: 'presentiel', label: 'Présentiel' },
      { value: 'teletravail', label: 'Télétravail' },
      { value: 'off', label: 'Off' },
    ],
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  },
  {
    id: 'foot',
    category: 'activites',
    label: 'Foot',
    question: 'Foot ?',
    type: 'foot',
    nopeValue: null,
    types: [
      { value: 'match', label: 'Match' },
      { value: 'entrainement', label: 'Entraînement' },
    ],
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="12 7 16 10 14.5 15 9.5 15 8 10"/></svg>`,
  },
  {
    id: 'course',
    category: 'activites',
    label: 'Course',
    question: 'Course à pied ?',
    type: 'double_scale',
    nopeValue: null,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4" r="2"/><path d="M6 17l3-4 4 2 3-5"/><path d="M10 10l4-2 3 3"/><path d="M4 21h4l3-4"/></svg>`,
  },
  {
    id: 'promenade_marcus',
    category: 'activites',
    label: 'Marcus',
    question: 'Promenade de Marcus ?',
    type: 'double_scale',
    nopeValue: null,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="8" r="1.5"/><circle cx="17" cy="8" r="1.5"/><circle cx="10" cy="5" r="1.5"/><circle cx="14" cy="5" r="1.5"/><path d="M8 14c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5c0 2.5-1.5 4.5-4 4.5S8 16.5 8 14z"/></svg>`,
  },
  {
    id: 'alcool',
    category: 'habitudes',
    label: 'Alcool',
    question: 'Alcool ?',
    type: 'scale',
    minLabel: 'Léger',
    maxLabel: 'Élevé',
    nopeValue: 0,
    autoAdvance: true,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M6 3h12l-1.5 6a4.5 4.5 0 0 1-9 0L6 3z"/></svg>`,
  },
  {
    id: 'buse',
    category: 'habitudes',
    label: 'Buse',
    question: 'Buse ?',
    type: 'scale',
    minLabel: 'Léger',
    maxLabel: 'Élevé',
    nopeValue: 0,
    autoAdvance: true,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-4.3 0-7-2.7-7-7 0-3.3 2.7-6 6-6h8c2.2 0 4 1.8 4 4s-1.8 4-4 4H9"/><path d="M14 6V3"/><path d="M18 7l2-2"/></svg>`,
  },
  {
    id: 'alimentation',
    category: 'habitudes',
    label: 'Alimentation',
    question: 'Alimentation ?',
    type: 'scale',
    minLabel: 'Très sain',
    maxLabel: 'Junk food',
    nopeValue: null,
    autoAdvance: true,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,
  },
  {
    id: 'sommeil',
    category: 'habitudes',
    label: 'Sommeil',
    question: 'Sommeil ?',
    type: 'sommeil',
    nopeValue: null,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  },
];

export function getMetricById(id) {
  return METRICS.find((m) => m.id === id);
}
