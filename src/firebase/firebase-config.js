import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "dummy"
};

let app;
try {
  if (firebaseConfig.apiKey !== "dummy") {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn("Firebase config is missing or empty. Firebase is not initialized.");
  }
} catch (error) {
  console.error("Firebase init failed:", error);
}

export { app };
