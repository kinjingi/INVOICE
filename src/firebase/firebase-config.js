import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCnguQ_nUsBlhtMTCpRs8yqATsHIGj2sL0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "invoice-56fe7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "invoice-56fe7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "invoice-56fe7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "494619749416",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:494619749416:web:70359f7676108e7232d91d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5NCHRCS6B1"
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
