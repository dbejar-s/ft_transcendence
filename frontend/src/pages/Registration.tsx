import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Import necessary Firebase Auth functions

// Declare google as a global object to avoid TypeScript errors
declare const google: any;

// Define props interface for clarity and type safety
interface RegisterProps {
  setIsLoggedIn: (value: boolean) => void;
  setGlobalMessage: (value: { type: 'success' | 'error'; text: string } | null) => void;
}

export default function Register({ setIsLoggedIn, setGlobalMessage }: RegisterProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get the Firebase Auth instance
  const auth = getAuth(); // Firebase app should be initialized in main.tsx

  // Debugging: Log the value of setIsLoggedIn received by Registration component
  console.log("Registration: setIsLoggedIn prop received:", setIsLoggedIn);


  // useEffect hook to initialize Google Identity Services for One Tap/Button
  useEffect(() => {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        // IMPORTANT: Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual Google Client ID from .env
        // Example: client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, // Ensure you have this in your .env file
        callback: handleGoogleOneTapCredentialResponse, // Callback for One Tap (if used)
      });
      // You can also render the button if you want the Google branded UI
      // google.accounts.id.renderButton(
      //   document.getElementById("googleSignInDiv"),
      //   { theme: "outline", size: "large" }
      // );
    }
  }, []);

  // Callback for Google One Tap or automated sign-in
  const handleGoogleOneTapCredentialResponse = async (response: any) => {
    // This part processes the ID token from Google Identity Services directly
    // This is useful for silent or One Tap sign-in.
    // For a manual button click, you'd use signInWithPopup or signInWithRedirect.
    console.log("Encoded ID Token from One Tap/GSI: " + response.credential);

    try {
      // Sign in with Firebase using the Google ID token
      const credential = GoogleAuthProvider.credential(response.credential);
      await signInWithPopup(auth, credential); // Use signInWithPopup with the credential

      // Debugging: Log the value of setIsLoggedIn before calling it
      console.log("Registration (One Tap): setIsLoggedIn before call:", setIsLoggedIn);
      if (typeof setIsLoggedIn !== 'function') {
        console.error("ERROR: setIsLoggedIn is not a function in One Tap handler.");
        setMessage({ type: 'error', text: t('signUpError') || 'Authentication flow interrupted.' });
        return;
      }

      setIsLoggedIn(true);
      setGlobalMessage({ type: 'success', text: t('googleLoginSuccess') || 'Successfully logged in with Google!' });
      navigate('/');
    } catch (error: any) {
      console.error("Firebase Google Sign-in error (One Tap):", error);
      setMessage({ type: 'error', text: error.message || t('signUpError') || 'Error during Google sign-in.' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); // Clear previous messages

    // TODO: Add connexion logic (e.g., API call to your backend for email/password login)
    // For now, simulating a successful login
    try {
      // Example with Firebase Email/Password Auth (if enabled in Firebase console)
      // await signInWithEmailAndPassword(auth, email, password);
      console.log('Login with', email, password);

      // Debugging: Log the value of setIsLoggedIn before calling it
      console.log("Registration (Email/Pass): setIsLoggedIn before call:", setIsLoggedIn);
      if (typeof setIsLoggedIn !== 'function') {
        console.error("ERROR: setIsLoggedIn is not a function in Email/Pass handler.");
        setMessage({ type: 'error', text: t('signUpError') || 'Login flow interrupted.' });
        return;
      }

      setIsLoggedIn(true);
      setGlobalMessage({ type: 'success', text: t('loginSuccess') || 'Login successful!' });
      navigate('/');
    } catch (error: any) {
      console.error("Email/Password login error:", error);
      setMessage({ type: 'error', text: error.message || t('signUpError') || 'Login failed.' });
    }
  };

  // Function to handle Google Sign-in initiated by button click
  const handleGoogleLogin = async () => {
    setMessage(null); // Clear previous messages
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      // Debugging: Log the value of setIsLoggedIn before calling it
      console.log("Registration (Google Button): setIsLoggedIn before call:", setIsLoggedIn);
      if (typeof setIsLoggedIn !== 'function') {
        console.error("ERROR: setIsLoggedIn is not a function in Google button handler.");
        setMessage({ type: 'error', text: t('signUpError') || 'Authentication flow interrupted.' });
        return;
      }

      setIsLoggedIn(true);
      setGlobalMessage({ type: 'success', text: t('googleLoginSuccess') || 'Successfully logged in with Google!' });
      navigate('/');
    } catch (error: any) {
      console.error("Firebase Google Sign-in error (Button):", error);
      setMessage({ type: 'error', text: error.message || t('signUpError') || 'Error during Google sign-in.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#44433e] text-[#FFFACD] p-6">
      <div className="bg-[#3b3a37] p-8 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-vt323 mb-6 text-center">{t('registerTitle') || 'Register / Login'}</h2>

        {/* Message Display Area */}
        {message && (
          <div
            className={`p-3 mb-4 rounded-lg text-center font-vt323 ${
              message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder={t('email') || 'Email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#3b3a37] placeholder-[#777] focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder={t('password') || 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#3b3a37] placeholder-[#777] focus:outline-none"
            required
          />

          <button
            type="submit"
            className="w-full bg-[#FFFACD] text-[#3b3a37] font-vt323 text-xl py-3 rounded-lg hover:bg-[#e0e0a0] transition"
          >
            {t('login') || 'Login'}
          </button>
        </form>

        <div className="my-6 text-center text-sm">
          {t('noAccount') || "Don't have an account?"}{' '}
          <a href="/signup" className="underline hover:text-white">
            {t('signUp') || 'Sign up'}
          </a>
        </div>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-[#FFFACD]" />
          <span className="mx-3 text-sm">{t('or') || 'OR'}</span>
          <hr className="flex-grow border-[#FFFACD]" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white text-[#3b3a37] py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google logo"
            className="inline w-5 h-5 mr-2 align-middle"
          />
          {t('continueWithGoogle') || 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}