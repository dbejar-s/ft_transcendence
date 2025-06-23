import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Import getFirestore if you plan to use Firestore

// Global variables provided by the Canvas environment (used for Canvas runtime only)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Define firebaseConfig using environment variables for local development
// These variables must be prefixed with VITE_ in your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Uncomment if you have this
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore if you plan to use it

// Perform initial authentication (This part uses Canvas-specific auth token if available)
async function initializeAuth() {
  try {
    if (typeof __initial_auth_token !== 'undefined') {
      await signInWithCustomToken(auth, __initial_auth_token);
      console.log("Signed in with custom token (Canvas environment).");
    } else {
      // For local development, if no custom token, sign in anonymously or do nothing.
      // Firebase will manage sessions after a successful Google login.
      console.log("No custom token. Authentication handled by Firebase client SDK.");
      // You can still sign in anonymously here if needed for unauthenticated access to Firebase services
      // await signInAnonymously(auth);
    }
  } catch (error) {
    console.error("Firebase authentication error during initialization:", error);
  }
}

// Call the authentication initialization
initializeAuth();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
