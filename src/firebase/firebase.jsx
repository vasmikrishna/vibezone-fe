// Import necessary Firebase services
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging"; // For push notifications
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAe-cW0iwNTwmzNw4Ff9rQaxDkrYc03EI",
  authDomain: "vibezone-c8634.firebaseapp.com",
  projectId: "vibezone-c8634",
  storageBucket: "vibezone-c8634.firebasestorage.app",
  messagingSenderId: "520997156832",
  appId: "1:520997156832:web:91c2464851bc9b128cdd85",
  measurementId: "G-KFWNKJ7BJ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Analytics
export const analytics = getAnalytics(app);

// Initialize Messaging (For Push Notifications)
export const messaging = getMessaging(app);

export default app;
