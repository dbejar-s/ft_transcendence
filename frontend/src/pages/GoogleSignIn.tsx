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
      const userData = await authService.handleGoogleLogin({ credential: credentialResponse.credential });

      // Store the JWT token
      if (userData && userData.token) {
        try {
          localStorage.setItem('token', userData.token);
        } catch (storageError) {
          console.error('Failed to store token in localStorage:', storageError);
          return;
        }
      } else {
        console.error('No token received from backend!');
        return; // Don't proceed if there's no token
      }

      // Validate user data before attempting login
      if (!userData.user || !userData.user.id || !userData.user.email || !userData.user.username) {
        console.error('Incomplete user data received:', userData.user);
        return;
      }

      // Auto-login with Google avatar
      try {
        login({
          id: userData.user.id,
          email: userData.user.email,
          username: userData.user.username,
          avatar: userData.user.avatar, // Directly from Google
          language: userData.user.language || navigator.language.split('-')[0] || 'en',
          provider: 'google',
        });
      } catch (loginError) {
        console.error('Error in login context:', loginError);
        return;
      }
      
      // Final verification that everything is set up correctly
      const finalToken = localStorage.getItem('token');
      if (!finalToken) {
        console.error('CRITICAL: Token not found in localStorage after login process!');
        return;
      }
      
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
