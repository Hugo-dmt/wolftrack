import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebase.js';

const LOCAL_DB_KEY = 'wolftrack_local_db_v1';
const LOCAL_USER_KEY = 'wolftrack_local_user_v1';

function generateInviteCode() {
  // Caractères non ambigus (sans O/0, I/1) faciles à dicter
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `WOLF-${code}`;
}

function readLocalDb() {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { users: {}, subjects: {}, entries: {} };
}

function writeLocalDb(db) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

export function getLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createLocalSessionUser(displayName = 'Utilisateur Local') {
  const user = {
    uid: 'local-user-1',
    email: 'local@wolftrack.app',
    displayName,
    isLocal: true,
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  return user;
}

export function clearLocalSessionUser() {
  localStorage.removeItem(LOCAL_USER_KEY);
}

function useFirestore(user) {
  return Boolean(user && !user.isLocal && isFirebaseConfigured() && getDb());
}

/**
 * Récupère ou crée le document users/{uid}
 */
export async function getOrCreateUserProfile(user) {
  if (!useFirestore(user)) {
    const db = readLocalDb();
    if (!db.users[user.uid]) {
      db.users[user.uid] = {
        email: user.email || '',
        displayName: user.displayName || 'Anonyme',
        activeSubjectId: null,
      };
      writeLocalDb(db);
    }
    return db.users[user.uid];
  }

  const db = getDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  }
  const profile = {
    email: user.email || '',
    displayName: user.displayName || 'Anonyme',
    activeSubjectId: null,
  };
  await setDoc(ref, profile);
  return profile;
}

/**
 * Crée un nouveau profil sujet et y rattache l'utilisateur
 */
export async function createSubject(user, pseudo) {
  const cleanPseudo = pseudo.trim();
  if (!cleanPseudo) throw new Error('Le pseudo est requis.');

  const inviteCode = generateInviteCode();

  if (!useFirestore(user)) {
    const db = readLocalDb();
    const subjectId = `subj_${Date.now()}`;
    const subject = {
      id: subjectId,
      pseudo: cleanPseudo,
      inviteCode,
      members: [user.uid],
      createdAt: new Date().toISOString(),
    };
    db.subjects[subjectId] = subject;
    db.entries[subjectId] = [];
    if (!db.users[user.uid]) {
      db.users[user.uid] = {
        email: user.email || '',
        displayName: user.displayName || 'Anonyme',
        activeSubjectId: subjectId,
      };
    } else {
      db.users[user.uid].activeSubjectId = subjectId;
    }
    writeLocalDb(db);
    return subject;
  }

  const db = getDb();
  const subjectData = {
    pseudo: cleanPseudo,
    inviteCode,
    members: [user.uid],
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'subjects'), subjectData);
  await updateDoc(doc(db, 'users', user.uid), {
    activeSubjectId: docRef.id,
  });

  return {
    id: docRef.id,
    pseudo: cleanPseudo,
    inviteCode,
    members: [user.uid],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Rejoint un profil existant via son inviteCode
 */
export async function joinSubjectByCode(user, rawCode) {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error('Le code est requis.');

  if (!useFirestore(user)) {
    const db = readLocalDb();
    const found = Object.values(db.subjects).find((s) => s.inviteCode === code);
    if (!found) {
      throw new Error('Aucun profil trouvé avec ce code.');
    }
    if (!found.members.includes(user.uid)) {
      found.members.push(user.uid);
    }
    db.users[user.uid].activeSubjectId = found.id;
    writeLocalDb(db);
    return found;
  }

  const db = getDb();
  const q = query(collection(db, 'subjects'), where('inviteCode', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error('Aucun profil trouvé avec ce code.');
  }

  const subjectDoc = snap.docs[0];
  const data = subjectDoc.data();
  await updateDoc(doc(db, 'subjects', subjectDoc.id), {
    members: arrayUnion(user.uid),
  });
  await updateDoc(doc(db, 'users', user.uid), {
    activeSubjectId: subjectDoc.id,
  });

  return {
    id: subjectDoc.id,
    ...data,
    members: data.members.includes(user.uid) ? data.members : [...data.members, user.uid],
  };
}

/**
 * Récupère les infos d'un sujet
 */
export async function getSubject(user, subjectId) {
  if (!subjectId) return null;

  if (!useFirestore(user)) {
    const db = readLocalDb();
    return db.subjects[subjectId] || null;
  }

  const db = getDb();
  const snap = await getDoc(doc(db, 'subjects', subjectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Ajoute une entrée horodatée (append-only) dans subjects/{subjectId}/entries
 */
export async function addEntry(user, { subjectId, targetDate, sourceMode, metric, value }) {
  const entryPayload = {
    targetDate,
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'Anonyme',
    sourceMode,
    metric,
    value,
  };

  if (!useFirestore(user)) {
    const db = readLocalDb();
    if (!db.entries[subjectId]) db.entries[subjectId] = [];
    const entry = {
      id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...entryPayload,
      createdAt: new Date().toISOString(),
    };
    db.entries[subjectId].push(entry);
    writeLocalDb(db);
    return entry;
  }

  const db = getDb();
  const docRef = await addDoc(collection(db, 'subjects', subjectId, 'entries'), {
    ...entryPayload,
    createdAt: serverTimestamp(),
  });
  return {
    id: docRef.id,
    ...entryPayload,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Exporte l'intégralité des entrées d'un sujet pour analyse JSON en aval
 */
export async function exportAllEntries(user, subject) {
  if (!useFirestore(user)) {
    const db = readLocalDb();
    const rawEntries = db.entries[subject.id] || [];
    const sorted = [...rawEntries].sort((a, b) =>
      a.targetDate === b.targetDate
        ? String(a.createdAt).localeCompare(String(b.createdAt))
        : a.targetDate.localeCompare(b.targetDate)
    );
    return {
      exportedAt: new Date().toISOString(),
      subject: {
        id: subject.id,
        pseudo: subject.pseudo,
        inviteCode: subject.inviteCode,
      },
      totalEntries: sorted.length,
      entries: sorted,
    };
  }

  const db = getDb();
  const q = query(
    collection(db, 'subjects', subject.id, 'entries'),
    orderBy('targetDate', 'asc'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  const entries = snap.docs.map((d) => {
    const data = d.data();
    const createdAtIso =
      data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || null;
    return {
      id: d.id,
      targetDate: data.targetDate,
      createdAt: createdAtIso,
      authorUid: data.authorUid,
      authorName: data.authorName,
      sourceMode: data.sourceMode,
      metric: data.metric,
      value: data.value,
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    subject: {
      id: subject.id,
      pseudo: subject.pseudo,
      inviteCode: subject.inviteCode,
    },
    totalEntries: entries.length,
    entries,
  };
}

/**
 * Retourne l'ensemble des dates (YYYY-MM-DD) ayant au moins une entrée enregistrée
 */
export async function getCompletedDates(user, subjectId) {
  if (!subjectId) return new Set();

  if (!useFirestore(user)) {
    const db = readLocalDb();
    const rawEntries = db.entries[subjectId] || [];
    return new Set(rawEntries.map((e) => e.targetDate).filter(Boolean));
  }

  const db = getDb();
  const snap = await getDocs(collection(db, 'subjects', subjectId, 'entries'));
  const dates = new Set();
  snap.forEach((d) => {
    const td = d.data()?.targetDate;
    if (td) dates.add(td);
  });
  return dates;
}
