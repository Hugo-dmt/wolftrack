import { initializeApp, getApps, deleteApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const RUNTIME_CONFIG_KEY = 'wolftrack_firebase_config';

let app = null;
let auth = null;
let db = null;

function getEnvConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

export function getRuntimeConfig() {
  try {
    const raw = localStorage.getItem(RUNTIME_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.apiKey && parsed.projectId) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function getFirebaseConfig() {
  return getEnvConfig() || getRuntimeConfig();
}

export function isFirebaseConfigured() {
  return Boolean(getFirebaseConfig());
}

export async function saveRuntimeFirebaseConfig(configObj) {
  localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(configObj));
  for (const existing of getApps()) {
    await deleteApp(existing);
  }
  app = null;
  auth = null;
  db = null;
  initFirebaseIfPossible();
}

export async function clearRuntimeFirebaseConfig() {
  localStorage.removeItem(RUNTIME_CONFIG_KEY);
  for (const existing of getApps()) {
    await deleteApp(existing);
  }
  app = null;
  auth = null;
  db = null;
}

export function initFirebaseIfPossible() {
  if (app && auth && db) return { app, auth, db };
  const cfg = getFirebaseConfig();
  if (!cfg) return null;

  app = getApps().length ? getApps()[0] : initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);

  // Persistance locale pour ne jamais avoir à se reconnecter sur mobile
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Auth persistence warning:', err);
  });

  return { app, auth, db };
}

export function getDb() {
  if (!db) initFirebaseIfPossible();
  return db;
}

export function getFirebaseAuth() {
  if (!auth) initFirebaseIfPossible();
  return auth;
}

export async function signInWithGoogle() {
  const instance = initFirebaseIfPossible();
  if (!instance) {
    throw new Error('Firebase non configuré.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(instance.auth, provider);
    return result.user;
  } catch (err) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(instance.auth, provider);
      return null;
    }
    throw err;
  }
}

export async function signOutFirebase() {
  if (auth) {
    await signOut(auth);
  }
}

export function onFirebaseAuthChanged(callback) {
  const instance = initFirebaseIfPossible();
  if (!instance) return () => {};
  return onAuthStateChanged(instance.auth, callback);
}
