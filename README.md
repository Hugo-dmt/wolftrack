# Wolftrack

Progressive Web App (PWA) mobile-first conçue pour le suivi quotidien ultrarapide à une main (symptômes et habitudes de vie), avec export JSON structuré pour l'analyse de corrélations.

## Fonctionnalités
- **Mode A — Session Express** (`100dvh`, zéro scroll) : 11 questions en moins de 45 secondes avec auto-save et boutons *Nope* / *Suivant* dans la zone du pouce.
- **Mode B — Saisie Rapide** : grille 2 colonnes + Bottom Sheet tactile pour noter un événement isolé à la volée.
- **Partage couple** : création de profil avec code unique (`WOLF-XXXX`) pour alimenter le même sujet à deux.
- **Export JSON** : téléchargement direct de `wolftrack-export-YYYY-MM-DD.json`.
- **Dual-mode** : fonctionne immédiatement en mode local hors-ligne, ou connecté à **Firebase (Google Sign-In + Cloud Firestore)**.

## Déploiement Firebase
```bash
npm install -g firebase-tools
firebase login
firebase init # sélectionner Hosting + Firestore existants
npm run build
firebase deploy
```
Les règles de sécurité sont prêtes dans `firestore.rules` et la configuration dans `firebase.json`.
