import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../context/PlayerContext';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { FaEdit } from 'react-icons/fa'; // Import edit icon

// Define interfaces for user data and match history for type safety
interface UserProfile {
  alias: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  matchHistory: MatchRecord[];
  language: string; // Add language to profile
}

interface MatchRecord {
  opponent: string;
  date: string;
  result: 'win' | 'loss';
  score: string;
}

// Sub-component for inline editable text fields
interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  type?: string;
  placeholder?: string;
  editable: boolean;
  canEdit?: boolean; // New prop to control if the field can be edited at all (e.g., email directly from auth)
}

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onSave,
  type = 'text',
  placeholder = '',
  editable,
  canEdit = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fieldValue, setFieldValue] = useState(value);
  const { t } = useTranslation();

  useEffect(() => {
    setFieldValue(value); // Update internal state when external value changes
  }, [value]);

  const handleSave = () => {
    onSave(fieldValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setFieldValue(value); // Revert to original value
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
      <span className="text-xl font-vt323 text-gray-400">{label}:</span>
      {isEditing && editable && canEdit ? (
        <input
          type={type}
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          onBlur={handleSave} // Save when input loses focus
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-[#FFFACD] text-[#3b3a37] p-1 rounded-md text-xl focus:outline-none flex-grow mx-2"
          autoFocus // Focus on the input when it appears
        />
      ) : (
        <span className="text-xl font-vt323 flex-grow text-right pr-2">
          {type === 'password' ? '********' : fieldValue || 'N/A'}
        </span>
      )}
      {editable && canEdit && !isEditing && (
        <FaEdit className="text-lg text-[#FFFACD] cursor-pointer hover:text-yellow-300 ml-2" onClick={() => setIsEditing(true)} />
      )}
    </div>
  );
};


export default function Profile() {
  const { t, i18n } = useTranslation();
  const { currentUser, loadingAuth } = usePlayer();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentTab, setCurrentTab] = useState<'profile' | 'friends' | 'matchHistory' | 'stats'>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordEditMode, setPasswordEditMode] = useState(false); // New state for password edit form
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [currentPasswordForReauth, setCurrentPasswordForReauth] = useState(''); // For re-authentication

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!loadingAuth && currentUser) {
        setLoadingProfile(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as UserProfile;
            setProfile(data);
          } else {
            const defaultProfile: UserProfile = {
              alias: currentUser.displayName || `Player-${currentUser.uid.substring(0, 5)}`,
              avatarUrl: currentUser.photoURL || 'https://placehold.co/150x150/3b3a37/FFFACD?text=Avatar',
              wins: 0,
              losses: 0,
              matchHistory: [],
              language: i18n.language || 'en', // Set default language from i18n
            };
            await setDoc(userDocRef, defaultProfile);
            setProfile(defaultProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setMessage({ type: 'error', text: t('profileLoadError') || 'Error loading profile.' });
        } finally {
          setLoadingProfile(false);
        }
      } else if (!loadingAuth && !currentUser) {
        setLoadingProfile(false);
        setProfile(null);
        setMessage({ type: 'error', text: t('notLoggedInProfile') || 'Please log in to view your profile.' });
      }
    };

    fetchUserProfile();
  }, [loadingAuth, currentUser, db, t, i18n.language]); // Add i18n.language to dependencies

  const handleUpdateAlias = async (newAlias: string) => {
    if (!currentUser) {
      setMessage({ type: 'error', text: t('notLoggedInUpdate') || 'Please log in to update your profile.' });
      return;
    }
    setMessage(null);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { alias: newAlias.trim() }, { merge: true });
      setProfile(prev => prev ? { ...prev, alias: newAlias.trim() } : null);
      setMessage({ type: 'success', text: t('profileUpdateSuccess') || 'Profile updated successfully!' });
    } catch (error) {
      console.error("Error updating alias:", error);
      setMessage({ type: 'error', text: t('profileUpdateError') || 'Error updating alias.' });
    }
  };

  const handleUpdateAvatarUrl = async (newUrl: string) => {
    if (!currentUser) {
      setMessage({ type: 'error', text: t('notLoggedInUpdate') || 'Please log in to update your profile.' });
      return;
    }
    setMessage(null);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { avatarUrl: newUrl.trim() }, { merge: true });
      setProfile(prev => prev ? { ...prev, avatarUrl: newUrl.trim() } : null);
      // Optionally update Firebase Auth photoURL directly if it came from Google/Email/Pass
      if (auth.currentUser) {
        // await updateProfile(auth.currentUser, { photoURL: newUrl.trim() }); // Requires updateProfile import
      }
      setMessage({ type: 'success', text: t('profileUpdateSuccess') || 'Profile updated successfully!' });
    } catch (error) {
      console.error("Error updating avatar URL:", error);
      setMessage({ type: 'error', text: t('profileUpdateError') || 'Error updating avatar URL.' });
    }
  };

  const handleUpdateLanguage = async (newLang: string) => {
    if (!currentUser) {
      setMessage({ type: 'error', text: t('notLoggedInUpdate') || 'Please log in to update your profile.' });
      return;
    }
    setMessage(null);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { language: newLang }, { merge: true });
      setProfile(prev => prev ? { ...prev, language: newLang } : null);
      i18n.changeLanguage(newLang); // Change app language immediately
      setMessage({ type: 'success', text: t('profileUpdateSuccess') || 'Language updated successfully!' });
    } catch (error) {
      console.error("Error updating language:", error);
      setMessage({ type: 'error', text: t('profileUpdateError') || 'Error updating language.' });
    }
  };

  const handleUpdateEmail = async (newEmail: string) => {
    // Firebase requires re-authentication for email updates
    // This is a simplified placeholder. A real implementation would require a re-authentication flow.
    setMessage({ type: 'error', text: t('emailUpdateInfo') || 'Email update requires re-authentication. This feature is not fully implemented yet.' });
    console.warn("Email update attempted. Firebase requires re-authentication for this operation.");
    // Example of re-authentication setup (requires user's current password)
    // if (auth.currentUser && auth.currentUser.email) {
    //   const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPasswordForReauth);
    //   try {
    //     await reauthenticateWithCredential(auth.currentUser, credential);
    //     await updateEmail(auth.currentUser, newEmail.trim());
    //     setMessage({ type: 'success', text: t('profileUpdateSuccess') || 'Email updated successfully!' });
    //   } catch (error) {
    //     console.error("Error re-authenticating or updating email:", error);
    //     setMessage({ type: 'error', text: error.message || t('profileUpdateError') || 'Failed to update email.' });
    //   }
    // }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage({ type: 'error', text: t('notLoggedInUpdate') || 'Please log in to update your password.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: t('passwordMismatch') });
      return;
    }
    if (newPassword.length < 6) { // Firebase minimum password length
        setMessage({ type: 'error', text: t('passwordTooShort') || 'Password must be at least 6 characters.' });
        return;
    }

    setMessage(null);
    try {
        // Re-authentication is required if the user has signed in too long ago.
        // A robust implementation would check auth.currentUser.reauthenticateWithCredential()
        // and prompt for current password if needed.
        // For simplicity, this example directly calls updatePassword.
        // In a real app, you might need:
        // const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPasswordForReauth);
        // await reauthenticateWithCredential(auth.currentUser, credential);

        await updatePassword(currentUser, newPassword);
        setMessage({ type: 'success', text: t('passwordUpdateSuccess') || 'Password updated successfully!' });
        setPasswordEditMode(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setCurrentPasswordForReauth('');
    } catch (error: any) {
        console.error("Error updating password:", error);
        // Handle common errors like 'auth/requires-recent-login'
        if (error.code === 'auth/requires-recent-login') {
            setMessage({ type: 'error', text: t('reauthRequired') || 'Please log in again to update your password.' });
            // You might redirect to re-authentication screen or show a modal to enter current password
        } else {
            setMessage({ type: 'error', text: error.message || t('profileUpdateError') || 'Error updating password.' });
        }
    }
  };


  if (loadingAuth || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#44433e] text-[#FFFACD] font-vt323 text-3xl">
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#44433e] text-white text-center p-8">
        <h2 className="text-3xl font-semibold mb-4">{t('notLoggedInProfile') || 'Please log in to view your profile.'}</h2>
        {message && (
          <div className="p-3 mt-4 rounded-lg text-center font-vt323 bg-red-500 text-white">
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#44433e] px-6 py-12 text-[#FFFACD]">
      <div className="max-w-4xl w-full bg-[#3b3a37] p-8 rounded-xl shadow-xl">
        {/* Top Navigation for Profile Sections */}
        <div className="flex justify-around mb-8 border-b-2 border-gray-700 pb-4">
          {/* Display current alias on the tab for logged-in user */}
          <button
            onClick={() => setCurrentTab('profile')}
            className={`font-vt323 text-3xl px-4 py-2 rounded-lg transition ${
              currentTab === 'profile'
                ? 'bg-[#FFFACD] text-[#3b3a37]'
                : 'text-[#FFFACD] hover:bg-gray-700'
            }`}
          >
            {profile?.alias || t('profile')}
          </button>
          <button
            onClick={() => setCurrentTab('friends')}
            className={`font-vt323 text-3xl px-4 py-2 rounded-lg transition ${
              currentTab === 'friends'
                ? 'bg-[#FFFACD] text-[#3b3a37]'
                : 'text-[#FFFACD] hover:bg-gray-700'
            }`}
          >
            {t('friendsTab') || 'Friends'}
          </button>
          <button
            onClick={() => setCurrentTab('matchHistory')}
            className={`font-vt323 text-3xl px-4 py-2 rounded-lg transition ${
              currentTab === 'matchHistory'
                ? 'bg-[#FFFACD] text-[#3b3a37]'
                : 'text-[#FFFACD] hover:bg-gray-700'
            }`}
          >
            {t('matchHistoryTitle')}
          </button>
          <button
            onClick={() => setCurrentTab('stats')}
            className={`font-vt323 text-3xl px-4 py-2 rounded-lg transition ${
              currentTab === 'stats'
                ? 'bg-[#FFFACD] text-[#3b3a37]'
                : 'text-[#FFFACD] hover:bg-gray-700'
            }`}
          >
            {t('statisticsTab') || 'Statistics'}
          </button>
        </div>

        {message && (
          <div
            className={`p-3 mb-4 rounded-lg text-center font-vt323 ${
              message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {message.text}
          </div>
        )}

        {currentTab === 'profile' && (
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <img
              src={profile?.avatarUrl || 'https://placehold.co/150x150/3b3a37/FFFACD?text=Avatar'}
              alt={t('avatarAlt') || 'User Avatar'}
              className="w-40 h-40 rounded-full object-cover border-4 border-[#FFFACD] shadow-md mb-4"
            />
            {/* Edit Avatar URL (simplified as text input for now) */}
            <EditableField
              label={t('avatarUrlLabel') || 'Avatar URL'}
              value={profile?.avatarUrl || ''}
              onSave={handleUpdateAvatarUrl}
              editable={true}
              placeholder={t('newAvatarUrlPlaceholder') || 'New Avatar URL'}
            />

            {/* User Info Fields with Inline Editing */}
            <div className="w-full max-w-md mx-auto mt-6 bg-[#44433e] p-6 rounded-lg shadow-inner">
              <EditableField
                label={t('aliasLabel') || 'Alias'}
                value={profile?.alias || 'N/A'}
                onSave={handleUpdateAlias}
                editable={true}
                placeholder={t('newAliasPlaceholder') || 'New Alias'}
              />
              <EditableField
                label={t('email') || 'Email address'}
                value={currentUser.email || 'N/A'}
                onSave={handleUpdateEmail}
                editable={true} // Set to true, but handleUpdateEmail gives a warning about reauth
                canEdit={currentUser.providerData.some(p => p.providerId === 'password')} // Only allow editing if email/password provider
              />

              {/* Password Field with Show/Hide and Edit */}
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-xl font-vt323 text-gray-400">{t('password') || 'Password'}:</span>
                <span className="text-xl font-vt323 flex-grow text-right pr-2">
                  {showPassword ? (t('currentPasswordPlaceholder') || 'Your Password') : '********'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm text-blue-300 hover:underline px-2"
                >
                  {showPassword ? (t('hidePassword') || 'hidePassword') : (t('showPassword') || 'showPassword')}
                </button>
                {currentUser.providerData.some(p => p.providerId === 'password') && ( // Only show edit if email/password user
                  <FaEdit
                    className="text-lg text-[#FFFACD] cursor-pointer hover:text-yellow-300 ml-2"
                    onClick={() => setPasswordEditMode(true)}
                  />
                )}
              </div>

              {/* Password Edit Form (Conditional) */}
              {passwordEditMode && (
                <form onSubmit={handlePasswordUpdate} className="space-y-4 pt-4">
                  <input
                    type="password"
                    placeholder={t('newPasswordPlaceholder') || 'New Password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#3b3a37] placeholder-[#777] focus:outline-none"
                    required
                  />
                  <input
                    type="password"
                    placeholder={t('confirmNewPasswordPlaceholder') || 'Confirm New Password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#3b3a37] placeholder-[#777] focus:outline-none"
                    required
                  />
                  {/* Optional: Input for current password for re-authentication */}
                  {/* <input
                    type="password"
                    placeholder={t('currentPasswordForReauth') || 'Current Password (for re-auth)'}
                    value={currentPasswordForReauth}
                    onChange={(e) => setCurrentPasswordForReauth(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#3b3a37] placeholder-[#777] focus:outline-none"
                  /> */}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-[#FFFACD] text-[#3b3a37] font-vt323 text-xl py-3 rounded-lg hover:bg-[#e0e0a0] transition"
                    >
                      {t('savePassword') || 'Save Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPasswordEditMode(false); setNewPassword(''); setConfirmNewPassword(''); setCurrentPasswordForReauth(''); }}
                      className="flex-1 bg-gray-500 text-white font-vt323 text-xl py-3 rounded-lg hover:bg-gray-600 transition"
                    >
                      {t('cancel') || 'Cancel'}
                    </button>
                  </div>
                </form>
              )}


              {/* Preferred Language */}
              <div className="flex items-center justify-between py-2">
                <span className="text-xl font-vt323 text-gray-400">{t('preferredLanguage') || 'Preferred language'}:</span>
                <select
                  value={profile?.language || i18n.language}
                  onChange={(e) => handleUpdateLanguage(e.target.value)}
                  className="bg-[#44433e] text-[#FFFACD] border border-[#FFFACD] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#FFFACD] cursor-pointer text-xl font-vt323"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                </select>
                {/* No edit icon needed if it's a dropdown */}
              </div>
            </div>

            {/* Stats and Edit Button */}
            <div className="w-full max-w-md mx-auto mt-8 p-6 bg-[#44433e] rounded-lg shadow-inner">
              <h3 className="text-3xl font-vt323 mb-4 text-center">{t('statsTitle') || 'Stats'}</h3>
              <div className="grid grid-cols-2 gap-4 text-xl font-vt323 mb-6 text-center">
                <div>{t('wins') || 'Wins'}: <span className="text-green-400">{profile?.wins ?? 0}</span></div>
                <div>{t('losses') || 'Losses'}: <span className="text-red-400">{profile?.losses ?? 0}</span></div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'matchHistory' && (
          <div className="w-full max-w-2xl mx-auto">
            <h3 className="text-4xl font-vt323 text-center mb-6">{t('matchHistoryTitle') || 'Match History'}</h3>
            {profile?.matchHistory && profile.matchHistory.length > 0 ? (
              <ul className="space-y-4">
                {profile.matchHistory.map((match, index) => (
                  <li key={index} className="bg-[#44433e] p-5 rounded-lg flex flex-col md:flex-row justify-between items-center shadow-md">
                    <div className="flex flex-col md:flex-row items-center gap-2">
                      <span className="font-vt323 text-xl">{match.date}</span>
                      <span className="font-vt323 text-xl">{t('vs')} <span className="text-yellow-300">{match.opponent}</span></span>
                    </div>
                    <span
                      className={`font-vt323 text-2xl mt-2 md:mt-0 ${
                        match.result === 'win' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {match.result === 'win' ? t('win') : t('loss')} ({match.score})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xl font-vt323 text-gray-400 text-center">
                {t('noMatchHistory') || 'No match history available.'}
              </p>
            )}
          </div>
        )}

        {currentTab === 'friends' && (
          <div className="w-full max-w-2xl mx-auto text-center">
            <h3 className="text-4xl font-vt323 mb-6">{t('friendsTab') || 'Friends'}</h3>
            <p className="text-xl font-vt323 text-gray-400">
              {t('friendsContent') || 'Friends list and functionality coming soon!'}
            </p>
          </div>
        )}

        {currentTab === 'stats' && (
          <div className="w-full max-w-2xl mx-auto text-center">
            <h3 className="text-4xl font-vt323 mb-6">{t('statisticsTab') || 'Statistics'}</h3>
            <p className="text-xl font-vt323 text-gray-400">
              {t('statisticsContent') || 'Detailed game statistics will be displayed here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
