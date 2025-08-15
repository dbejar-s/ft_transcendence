import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { authService } from '../services/api';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';

export default function GoogleSignIn() {
  const navigate = useNavigate();
  const { login } = usePlayer();

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    try {
      // Send the Google token to your backend for verification
      const userData = await authService.loginWithGoogle(credentialResponse.credential);

      // Auto-login with Google avatar
      login({
        id: userData.id,
        email: userData.email,
        username: userData.username,
        avatar: userData.avatar, // Directly from Google
        language: navigator.language.split('-')[0] || 'en',
        provider: 'google',
      });

      // Go directly to CompleteProfile
      navigate('/complete-profile');
    } catch (err) {
      console.error('Google Sign-in error:', err);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => console.log('Google Sign-in failed')}
    />
  );
}
