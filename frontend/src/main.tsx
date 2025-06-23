import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Import getFirestore if you plan to use Firestore

// Global variables provided by the Canvas environment
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Retrieve Firebase configuration and app ID from global variables or use defaults
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore if you plan to use it

// Perform initial authentication
async function initializeAuth() {
  try {
    if (typeof __initial_auth_token !== 'undefined') {
      await signInWithCustomToken(auth, __initial_auth_token);
      console.log("Signed in with custom token.");
    } else {
      await signInAnonymously(auth);
      console.log("Signed in anonymously.");
    }
  } catch (error) {
    console.error("Firebase authentication error:", error);
  }
}

// Call the authentication initialization
initializeAuth();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)