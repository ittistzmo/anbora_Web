/**
 * ANBORA Environment Configuration Template
 * Copy this file to config/environment.js or inject via Firebase Hosting / init.json.
 * NEVER place private service-account credentials or secret AI API keys here.
 */
window.ANBORA_ENV = {
  APP_NAME: "ANBORA",
  TAGLINE: "A Little Care. A Stronger Connection.",
  ENVIRONMENT: "production",
  FIREBASE_CONFIG: {
    apiKey: "YOUR_FIREBASE_WEB_API_KEY",
    authDomain: "your-anbora-project.firebaseapp.com",
    projectId: "your-anbora-project",
    storageBucket: "your-anbora-project.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000"
  },
  FIREBASE_REGION: "asia-south1",
  VAPID_PUBLIC_KEY: "YOUR_WEB_PUSH_VAPID_PUBLIC_KEY",
  AI_COMPANION_ENDPOINT: "/api/aiCompanion", // Secure Cloud Function proxy endpoint
  USE_EMULATORS: false
};
