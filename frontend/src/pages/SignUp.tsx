import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'; // ADDED
import { signInWithGoogle } from "../firebase";
// ADDED: Import our new services
import { authService } from "../services/api";
import { usePlayer } from '../context/PlayerContext';

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate(); // ADDED
  const { login } = usePlayer(); // ADDED
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); // ADDED username field
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // CHANGED: This now calls our backend API
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      setError(t('passwordMismatch'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await authService.register(email, username, password);
      alert(t('signUpSuccess'));
      navigate('/register'); // Redirect to login page after successful registration
    } catch (err: any) {
      setError(err.message || t('signUpError'));
    } finally {
      setLoading(false);
    }
  };

  // CHANGED: This now calls our backend API after getting Google info
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      const googleUser = result.user;
      
      const googleUserData = {
          token: await googleUser.getIdToken(),
          email: googleUser.email,
          name: googleUser.displayName,
          sub: googleUser.uid,
          picture: googleUser.photoURL,
      };

      const { user } = await authService.handleGoogleLogin(googleUserData);
      login(user);
      navigate('/');
    } catch (error: any) {
      console.error("Google Sign-up failed:", error);
      setError(error.message || 'Google login failed');
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2a2a27] text-[#FFFACD] p-6">
      <div className="bg-[#20201d] p-8 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-press mb-6 text-center">{t('signUp')}</h2>

        <form onSubmit={handleSignUp} className="space-y-4">
          <input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none"
            required
          />
          
          {/* ADDED: Username input */}
          <input
            type="text"
            placeholder={t('chooseUsername')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none"
            required
          />

          <input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none"
            required
          />

          <input
            type="password"
            placeholder={t('confirmPassword')}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none"
            required
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFFACD] text-[#20201d] font-press text-xl py-3 rounded-lg hover:bg-[#e0e0a0] transition disabled:opacity-50"
          >
            {loading ? t('loading') : t('signUp')}
          </button>
        </form>
		<div className="flex items-center my-4">
		<hr className="flex-grow border-[#FFFACD]" />
		<span className="mx-3 text-sm">{t('or') || 'OR'}</span>
		<hr className="flex-grow border-[#FFFACD]" />
		</div>

		<button
		onClick={handleGoogleLogin}
        disabled={loading}
		className="w-full bg-white text-[#20201d] py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
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