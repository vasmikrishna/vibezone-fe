importScripts("https://www.gstatic.com/firebasejs/9.21.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.21.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAAe-cW0iwNTwmzNw4Ff9rQaxDkrYc03EI",
  authDomain: "vibezone-c8634.firebaseapp.com",
  projectId: "vibezone-c8634",
  storageBucket: "vibezone-c8634.firebasestorage.app",
  messagingSenderId: "520997156832",
  appId: "1:520997156832:web:91c2464851bc9b128cdd85",
  measurementId: "G-KFWNKJ7BJ9",
});

// Initialize Messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: payload.notification.icon,
  });
});
