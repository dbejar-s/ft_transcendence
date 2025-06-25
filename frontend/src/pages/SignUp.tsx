import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle } from "../firebase";

export default function SignUp() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      setError(t('passwordMismatch'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // TODO: Add backend API call here to register the user
      console.log('User registered:', email);
      alert(t('signUpSuccess'));
      // TODO: Redirection
    } catch (err) {
      setError(t('signUpError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      console.log("Google Sign-up successful:", user);
      // After successful sign-in, Firebase's onAuthStateChanged will handle the redirect.
    } catch (error) {
      console.error("Google Sign-up failed:", error);
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