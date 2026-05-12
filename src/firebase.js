import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Sign in anonymously so RTDB rules (auth != null) are satisfied
export const authReady = new Promise((resolve, reject) => {
  signInAnonymously(auth)
    .then(() => {
      console.log("Firebase: anonymous sign-in OK");
    })
    .catch((err) => {
      console.error("Firebase: anonymous sign-in failed:", err);
      reject(err);
    });

  // Resolve when auth state is confirmed
  onAuthStateChanged(auth, (user) => {
    if (user) resolve(user);
  });
});
