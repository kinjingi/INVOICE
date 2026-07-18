import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAY6Noi9kT94hajasg5uo5JMqK5YiZe64M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "invoice-b556f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "invoice-b556f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "invoice-b556f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "875275669408",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:875275669408:web:abdac2ed8553ac33f49ec5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5F3KHCEX6L"
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
