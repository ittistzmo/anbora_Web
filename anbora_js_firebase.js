/**
 * Firebase Integration Layer
 * Connects to existing Firebase Authentication, Firestore, and Cloud Functions:
 * - initUser
 * - recordCheckin
 * - tick (scheduled backend function)
 * - onAlertCreated (Firestore trigger)
 * - retryAlerts (scheduled backend function)
 * - whatsappWebhook (HTTP webhook)
 *
 * Automatically falls back to an offline-safe local simulation store ONLY if Firebase
 * web credentials are still placeholders, while clearly indicating live vs pending state.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";

const env = window.ANBORA_ENV || {};
const cfg = env.FIREBASE_CONFIG || {};
const isConfigured = Boolean(
  cfg.apiKey &&
  cfg.projectId &&
  !String(cfg.apiKey).includes("YOUR_FIREBASE") &&
  !String(cfg.projectId).includes("your-anbora-project")
);

let app = null;
let auth = null;
let db = null;
let functions = null;

if (isConfigured) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app, env.FIREBASE_REGION || "asia-south1");
}

export function isFirebaseLive() {
  return isConfigured;
}

// Local storage helper when Firebase config is pending
const LOCAL_KEY = "anbora_local_store_v1";
function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

export const firebaseService = {
  onAuthChanged(callback) {
    if (isConfigured && auth) {
      return onAuthStateChanged(auth, callback);
    }
    const local = readLocal();
    setTimeout(() => callback(local.currentUser || null), 50);
    return () => {};
  },

  async register({ name, email, phone, language, password }) {
    if (isConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // Call existing backend Cloud Function `initUser`
      const initUserFn = httpsCallable(functions, "initUser");
      await initUserFn({ name, email, phone, language });
      return cred.user;
    }
    const local = readLocal();
    const user = {
      uid: "local_" + Date.now(),
      displayName: name,
      email,
      phone,
      language: language || "en"
    };
    local.currentUser = user;
    local.profile = {
      uid: user.uid,
      name,
      email,
      phone,
      language: language || "en",
      activeCategory: "HOUSE",
      lastConfirmedCheckinAt: Date.now(),
      escalationStatus: "SAFE",
      remindersEnabled: true
    };
    local.checkins = local.checkins || [];
    local.contacts = local.contacts || [];
    local.alerts = local.alerts || [];
    writeLocal(local);
    return user;
  },

  async login(email, password) {
    if (isConfigured && auth) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    }
    const local = readLocal();
    if (!local.currentUser) {
      local.currentUser = {
        uid: "local_demo_user",
        displayName: email.split("@")[0],
        email
      };
      local.profile = local.profile || {
        uid: local.currentUser.uid,
        name: local.currentUser.displayName,
        email,
        phone: "",
        language: "en",
        activeCategory: "HOUSE",
        lastConfirmedCheckinAt: Date.now(),
        escalationStatus: "SAFE",
        remindersEnabled: true
      };
      writeLocal(local);
    }
    return local.currentUser;
  },

  async resetPassword(email) {
    if (isConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
      return;
    }
  },

  async logout() {
    if (isConfigured && auth) {
      await signOut(auth);
      return;
    }
    const local = readLocal();
    delete local.currentUser;
    writeLocal(local);
  },

  async getUserProfile(uid) {
    if (isConfigured && db) {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      // Initialize if missing
      const initUserFn = httpsCallable(functions, "initUser");
      await initUserFn({});
      const retry = await getDoc(doc(db, "users", uid));
      return retry.exists() ? { id: retry.id, ...retry.data() } : null;
    }
    const local = readLocal();
    return local.profile || null;
  },

  async updateUserProfile(uid, updates) {
    if (isConfigured && db) {
      await updateDoc(doc(db, "users", uid), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return;
    }
    const local = readLocal();
    local.profile = { ...(local.profile || {}), ...updates };
    writeLocal(local);
  },

  async recordCheckin(uid, payload) {
    if (isConfigured && functions) {
      // Connect directly to existing `recordCheckin` Cloud Function
      const recordCheckinFn = httpsCallable(functions, "recordCheckin");
      const result = await recordCheckinFn(payload);
      return result.data;
    }
    const local = readLocal();
    const now = Date.now();
    local.checkins = local.checkins || [];
    // Duplicate prevention within same hour bucket & category
    const existingIdx = local.checkins.findIndex(
      (c) => c.idempotencyKey === payload.idempotencyKey
    );
    const entry = {
      id: payload.idempotencyKey || "chk_" + now,
      uid,
      category: payload.category,
      mandatory: payload.category === "HOUSE" || payload.category === "OTHER",
      note: payload.note || "",
      location: payload.location || null,
      idempotencyKey: payload.idempotencyKey,
      confirmedAt: now,
      status: "CONFIRMED"
    };
    if (existingIdx >= 0) {
      local.checkins[existingIdx] = entry;
    } else {
      local.checkins.unshift(entry);
    }
    local.profile = {
      ...(local.profile || {}),
      activeCategory: payload.category,
      lastConfirmedCheckinAt: now,
      escalationStatus: "SAFE",
      activeAlertId: null
    };
    writeLocal(local);
    return { ok: true, entry, lastConfirmedCheckinAt: now };
  },

  async getCheckinHistory(uid) {
    if (isConfigured && db) {
      const q = query(
        collection(db, "users", uid, "checkins"),
        orderBy("confirmedAt", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const local = readLocal();
    return local.checkins || [];
  },

  async getEmergencyContacts(uid) {
    if (isConfigured && db) {
      const snap = await getDocs(collection(db, "users", uid, "contacts"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const local = readLocal();
    return local.contacts || [];
  },

  async addEmergencyContact(uid, contact) {
    if (isConfigured && db) {
      const ref = await addDoc(collection(db, "users", uid, "contacts"), {
        ...contact,
        createdAt: serverTimestamp()
      });
      return { id: ref.id, ...contact };
    }
    const local = readLocal();
    local.contacts = local.contacts || [];
    const item = { id: "cnt_" + Date.now(), ...contact };
    local.contacts.push(item);
    writeLocal(local);
    return item;
  },

  async deleteEmergencyContact(uid, contactId) {
    if (isConfigured && db) {
      await deleteDoc(doc(db, "users", uid, "contacts", contactId));
      return;
    }
    const local = readLocal();
    local.contacts = (local.contacts || []).filter((c) => c.id !== contactId);
    writeLocal(local);
  },

  async triggerSOSAlert(uid, location) {
    const idempotencyKey = `sos_${uid}_${Math.floor(Date.now() / 60000)}`;
    if (isConfigured && db) {
      // Writing to `alerts` collection triggers existing `onAlertCreated` Cloud Function
      const alertRef = doc(db, "alerts", idempotencyKey);
      await setDoc(
        alertRef,
        {
          uid,
          type: "MANUAL_SOS",
          status: "PENDING",
          idempotencyKey,
          location: location || null,
          createdAt: serverTimestamp()
        },
        { merge: true }
      );
      await updateDoc(doc(db, "users", uid), {
        escalationStatus: "ESCALATED",
        activeAlertId: idempotencyKey
      });
      return { alertId: idempotencyKey };
    }
    const local = readLocal();
    local.profile = {
      ...(local.profile || {}),
      escalationStatus: "ESCALATED",
      activeAlertId: idempotencyKey
    };
    writeLocal(local);
    return { alertId: idempotencyKey };
  },

  async cancelEscalation(uid, alertId) {
    if (isConfigured && db) {
      if (alertId) {
        await updateDoc(doc(db, "alerts", alertId), {
          status: "RESOLVED_SAFE",
          resolvedAt: serverTimestamp()
        });
      }
      await updateDoc(doc(db, "users", uid), {
        escalationStatus: "SAFE",
        activeAlertId: null,
        lastConfirmedCheckinAt: serverTimestamp()
      });
      return;
    }
    const local = readLocal();
    local.profile = {
      ...(local.profile || {}),
      escalationStatus: "SAFE",
      activeAlertId: null,
      lastConfirmedCheckinAt: Date.now()
    };
    writeLocal(local);
  }
};
