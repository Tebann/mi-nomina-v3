import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, hasFirebaseConfig } from './firebase';

const COLLECTION = 'mi_nomina_users';
const DOC = 'app';

let persistenceReady = false;
async function ensureLocalPersistence(){
  if(persistenceReady || !auth) return;
  await setPersistence(auth, browserLocalPersistence);
  persistenceReady = true;
}

export async function signInWithGoogle() {
  if (!hasFirebaseConfig || !auth || !googleProvider) {
    throw new Error('Firebase no está configurado.');
  }
  await ensureLocalPersistence();
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (e) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw e;
  }
}

export function watchAuth(callback) {
  if (!hasFirebaseConfig || !auth) {
    callback(null);
    return () => {};
  }
  ensureLocalPersistence().catch(() => {});
  return onAuthStateChanged(auth, callback);
}

export async function signOutGoogle() {
  if (!hasFirebaseConfig || !auth) return;
  await signOut(auth);
}

export async function loadCloudData(uid) {
  if (!hasFirebaseConfig || !db || !uid) return null;
  const ref = doc(db, COLLECTION, uid, 'state', DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data()?.payload || null;
}

export async function saveCloudData(uid, payload) {
  if (!hasFirebaseConfig || !db || !uid) return;
  const ref = doc(db, COLLECTION, uid, 'state', DOC);
  await setDoc(
    ref,
    {
      payload,
      updatedAt: serverTimestamp(),
      version: 1,
    },
    { merge: true }
  );
}
