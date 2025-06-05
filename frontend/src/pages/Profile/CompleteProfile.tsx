import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { predefinedAvatars, handleAvatarUpload, submitProfile} from '../../components/ProfileUtils';
import type { AvatarType } from '../../components/ProfileUtils';

export default function CompleteProfile() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<AvatarType>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitProfile(
      username,
      language,
      avatar,
      setError,
      setLoading,
      t
    );
    
    if (success) {
      window.location.href = '/home';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#44433e] text-[#FFFACD] p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-[#3b3a37] p-8 rounded-xl shadow-xl w-full max-w-md space-y-4"
      >
        <h2 className="text-3xl font-vt323 text-center mb-6">{t('completeProfile')}</h2>

        {/* Username input */}
        <input
          type="text"
          placeholder={t('chooseUsername')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#3b3a37] placeholder-[#777] focus:outline-none"
        />

        <label className="block text-sm justify-center">{t('chooseAvatar')}</label>

        {/* Predefined avatars */}
        <div className="flex space-x-3 mb-2 justify-center">
          {predefinedAvatars.map((av) => (
            <img
              key={av.alt}
              src={av.src}
              alt={av.alt}
              onClick={() => {
                setAvatar(av.src);
                setPreviewUrl(null);
                setError(null);
              }}
              className={`w-16 h-16 rounded-full cursor-pointer border-2 ${
                avatar === av.src ? 'border-[#FFFACD]' : 'border-transparent'
              }`}
            />
          ))}
        </div>

        {/* Upload avatar label and hidden input */}
        <label
          htmlFor="avatar-upload"
          className="block w-full cursor-pointer bg-[#FFFACD] text-[#3b3a37] p-3 rounded-lg text-center hover:bg-[#e0e0a0] transition"
        >
          {t('uploadImage')}
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={(e) => handleAvatarUpload(e, setAvatar, setPreviewUrl, setError, t)}
          className="hidden"
        />

        {/* Avatar preview */}
        {previewUrl && (
          <div className="mt-4 flex justify-center">
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="w-20 h-20 rounded-full border border-[#FFFACD]"
            />
          </div>
        )}

        {/* Language selection */}
        <label className="block text-sm mt-4 justify-center">{t('preferredLanguage')}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-2 rounded-lg text-[#3b3a37] bg-[#FFFACD] placeholder-[#777] focus:outline-none"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>

        {/* Error message */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FFFACD] text-[#3b3a37] font-vt323 text-xl py-3 rounded-lg hover:bg-[#e0e0a0] transition disabled:opacity-50"
        >
          {loading ? t('loading') : t('finish')}
        </button>
      </form>
    </div>
  );
}
