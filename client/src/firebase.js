import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

// Support both VITE_FIREBASE_* env vars and fallback configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCnoAX9vgi7XxpaEGSV4xXVRCvM-OVE4Dw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "resume-selector-2a321.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "resume-selector-2a321",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "resume-selector-2a321.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "710768440934",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:710768440934:web:cba284f1d9a0a03afe1fa7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6KXTGHLLMP"
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes("your_firebase")
);

export const firebaseApp = hasFirebaseConfig
  ? initializeApp(firebaseConfig)
  : null;

export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseReady = Boolean(firebaseApp && db);

export {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
};
