// src/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Tactical Firebase Configuration
 * Hard-linked to the lead-ace-vim5h project environment.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBE7GvOGH0ogvYDZGLXK7VqtnlEnpK4tuk",
  authDomain: "lead-ace-vim5h.firebaseapp.com",
  projectId: "lead-ace-vim5h",
  storageBucket: "lead-ace-vim5h.firebasestorage.app",
  messagingSenderId: "374178085881",
  appId: "1:374178085881:web:d9e2331a064dccedcbdb28"
};

// Initialize Firebase with singleton pattern to prevent multiple instances
export const app = firebaseConfig.apiKey
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

export const auth = app ? getAuth(app) : null;

export const db = app ? getFirestore(app) : null;
