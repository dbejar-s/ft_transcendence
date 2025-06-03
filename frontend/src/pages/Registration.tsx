import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add connexion logic
    console.log('Login with', email, password);
  };

  const handleGoogleLogin = () => {
    // TODO: Add Google Sign-in logic
    console.log('Connexion via Google');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#44433e] text-[#FFFACD] p-6">
      <div className="bg-[#3b3a37] p-8 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-vt323 mb-6 text-center">{t('registerTitle') || 'Register / Login'}</h2>

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
