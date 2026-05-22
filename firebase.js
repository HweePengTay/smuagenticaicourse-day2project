/**
 * firebase.js
 * 
 * What this file does (for beginners):
 * This file is our app's connection to the cloud (Google Firebase).
 * It enables two powerful features:
 * 1. User Authentication - allowing you to securely log in with your Google Account.
 * 2. Cloud Database (Firestore) - giving you a real-time table to save, load, and delete stock pairings in your Watchlist.
 * 
 * If Firebase is not fully set up or you are offline, it automatically falls back to "Guest Sandbox Mode" (using your browser's local storage) so you can still use the app seamlessly.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

export const isFirebaseConfigured = !!(
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== ""
);

let app;
let db = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.error("Firebase SDK initialization error:", err);
  }
} else {
  console.log(
    "Symmetry Dashboard Alert: Firebase configuration is not active. Using client-side Guest Local Storage fallback."
  );
}

export { db, auth, googleProvider };

export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
};

/**
 * Standardized High-Stakes Firestore Error Logging
 */
export function handleFirestoreError(error, operationType, path) {
  const message = error instanceof Error ? error.message : String(error);
  const currentUser = auth ? auth.currentUser : null;

  const errInfo = {
    error: message,
    authInfo: {
      userId: currentUser ? currentUser.uid : null,
      email: currentUser ? currentUser.email : null,
      emailVerified: currentUser ? currentUser.emailVerified : null,
      isAnonymous: currentUser ? currentUser.isAnonymous : null,
      tenantId: currentUser ? currentUser.tenantId : null,
      providerInfo: currentUser ? currentUser.providerData.map(p => ({
        providerId: p.providerId,
        email: p.email
      })) : []
    },
    operationType,
    path
  };

  console.error("Firestore Error Logged: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
