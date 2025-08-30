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
    
    console.log('🔑 Google credential received, length:', credentialResponse.credential.length);
    console.log('🔑 Token preview:', credentialResponse.credential.substring(0, 50) + '...');
    
    try {
      const userData = await authService.handleGoogleLogin({ 
        credential: credentialResponse.credential 
      });
      
      console.log('✅ Google auth successful:', userData);

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
        return;
      }

      // Check if user data is complete (existing user)
      if (userData.user && userData.user.id && userData.user.email && userData.user.username) {
        // Auto-login with existing user data
        try {
          login({
            id: userData.user.id,
            email: userData.user.email,
            username: userData.user.username,
            avatar: userData.user.avatar || '/default-avatar.svg',
            language: userData.user.language || navigator.language.split('-')[0] || 'en',
            provider: 'google',
          });
          
          // Redirect to home for existing users
          navigate('/');
        } catch (loginError) {
          console.error('Error in login context:', loginError);
          return;
        }
      } else {
        // Incomplete data - redirect to complete profile
        navigate('/complete-profile');
      }
    } catch (err) {
      console.error('❌ Google Sign-in failed:', err);
      
      // If it's an outdated token error, suggest specific solutions
      if (err && typeof err === 'object' && 'message' in err && 
          typeof err.message === 'string' && err.message.includes('outdated')) {
        console.log('💡 Token is outdated. Try these solutions:');
        console.log('   1. Sign out of Google account completely');
        console.log('   2. Clear all Google cookies and cache');
        console.log('   3. Use a different Google account');
        console.log('   4. Wait a few minutes and try again');
      }
      
      // Re-throw the error so it can be handled by the UI
      throw err;
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => {}}
    />
  );
}