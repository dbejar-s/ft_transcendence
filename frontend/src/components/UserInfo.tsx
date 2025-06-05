import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { predefinedAvatars, validateField, fakeApiUpdate } from './ProfileUtils';
import i18n from 'i18next';

interface UserInfoProps {
  avatar: string;
  username: string;
  email: string;
  language: string;
}

export default function UserInfo({ avatar, username, email, language }: UserInfoProps) {
  const { t } = useTranslation();

  const [avatarFile, setAvatarFile] = useState<string | File>(avatar);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameValue, setUsernameValue] = useState(username);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const [emailValue, setEmailValue] = useState(email);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [passwordValue, setPasswordValue] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [languageValue, setLanguageValue] = useState(language);
  const [isEditingLanguage, setIsEditingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState('');

  const saveField = async (field: 'username' | 'email' | 'language' | 'password') => {
    let value = '';
    if (field === 'username') value = usernameValue;
    else if (field === 'email') value = emailValue;
    else if (field === 'language') value = languageValue;
    else if (field === 'password') value = passwordValue;

    if (!validateField(field, value, 
      field === 'username' ? setUsernameError :
      field === 'email' ? setEmailError :
      field === 'password' ? setPasswordError : 
      setLanguageError, t)) return;

    try {
      await fakeApiUpdate(field, value);
      if (field === 'username') {
		await fakeApiUpdate('username', value);
  		await fakeApiUpdate('avatar', avatarFile);
		setIsEditingUsername(false);
	}
      else if (field === 'email') setIsEditingEmail(false);
      else if (field === 'language') {
        setIsEditingLanguage(false);
        i18n.changeLanguage(languageValue);
      } else if (field === 'password') {
        setIsEditingPassword(false);
        setPasswordValue('');
        setShowPassword(false);
      }
    } catch (error) {
      const errorHandler =
        field === 'username' ? setUsernameError :
        field === 'email' ? setEmailError :
        field === 'password' ? setPasswordError :
        setLanguageError;
      errorHandler(String(error));
    }
  };

  const cancelEdit = (field: 'username' | 'email' | 'language' | 'password') => {
    if (field === 'username') {
      setIsEditingUsername(false);
      setUsernameError('');
      setUsernameValue(username);
      setAvatarFile(avatar);
      setAvatarPreview(null);
    }
    if (field === 'email') {
      setIsEditingEmail(false);
      setEmailError('');
      setEmailValue(email);
    }
    if (field === 'language') {
      setIsEditingLanguage(false);
      setLanguageError('');
      setLanguageValue(language);
    }
    if (field === 'password') {
      setIsEditingPassword(false);
      setPasswordError('');
      setPasswordValue('');
      setShowPassword(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePredefinedAvatarClick = (avatarPath: string) => {
    setAvatarFile(avatarPath);
    setAvatarPreview(avatarPath);
  };

  return (
    <div className="bg-[#3b3a37] text-[#FFFACD] rounded-xl p-6 space-y-6 max-w-md mx-auto text-center relative">
      {/* Avatar + Username */}
      <div className="relative flex flex-col items-center space-y-2">
        <img
          src={
            avatarPreview || (typeof avatarFile === 'string'
              ? avatarFile
              : avatarFile
              ? URL.createObjectURL(avatarFile)
              : '')
          }
          alt="Avatar"
          className="w-20 h-20 rounded-full border-2 border-[#FFFACD]"
        />

        {isEditingUsername ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex flex-wrap justify-center gap-2">
              {predefinedAvatars.map((av, index) => (
                <img
                  key={index}
                  src={av.src}
                  alt={av.alt}
                  onClick={() => handlePredefinedAvatarClick(av.src)}
                  className={`w-12 h-12 rounded-full border-2 cursor-pointer ${
                    avatarPreview === av.src ? 'border-[#FFFACD]' : 'border-[#44433e]'
                  }`}
                />
              ))}
			  <label
			    htmlFor="avatar-upload"
			    className="cursor-pointer bg-[#FFFACD] text-black px-3 py-1 rounded text-sm h-8 flex items-center justify-center mt-3"
			  >
			    {t('uploadImage')}
			  </label>
			  <input
			    id="avatar-upload"
			    type="file"
			    accept="image/*"
			    onChange={handleAvatarChange}
			    className="hidden"
			  />
			</div>
            <input
          	  value={""}
              onChange={(e) => setUsernameValue(e.target.value)}
              placeholder={t('chooseNewUsername')}
              className="bg-[#FFFACD] text-[#3b3a37] p-1 rounded text-center flex"
              autoFocus
            />

            <div className="space-x-2">
              <button onClick={() => saveField('username')} className="bg-[#FFFACD] text-[#3b3a37] px-3 py-1 rounded">{t('save')}</button>
              <button onClick={() => cancelEdit('username')} className="text-red-500 underline text-sm">{t('cancel')}</button>
            </div>

            {usernameError && <p className="text-red-500 text-xs">{usernameError}</p>}
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-semibold">{usernameValue}</h3>
            <button
              onClick={() => setIsEditingUsername(true)}
              title={t('editUsername')}
              className="absolute top-20 right-0 text-[#FFFACD] hover:shadow-[0_0_8px_#FFFACD] rounded-full"
            >
              <Pencil size={20} />
            </button>
          </>
        )}
      </div>

      {/* Email */}
      <div className="relative">
        <label className="block text-sm mb-1">{t('email')}</label>
        <div className="flex justify-center items-center space-x-2">
          {isEditingEmail ? (
            <>
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="bg-[#FFFACD] text-[#3b3a37] p-2 rounded w-2/3"
                autoFocus
              />
              <button onClick={() => saveField('email')} className="bg-[#FFFACD] text-[#3b3a37] px-3 py-1 rounded">{t('save')}</button>
              <button onClick={() => cancelEdit('email')} className="text-red-500 underline text-sm">{t('cancel')}</button>
            </>
          ) : (
            <span className="w-2/3 truncate">{emailValue}</span>
          )}
        </div>
        {!isEditingEmail && (
          <button
            onClick={() => setIsEditingEmail(true)}
            title={t('editEmail')}
            className="absolute top-5 right-0 text-[#FFFACD] hover:shadow-[0_0_8px_#FFFACD] rounded-full"
          >
            <Pencil size={18} />
          </button>
        )}
        {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
      </div>

      {/* Password */}
      <div className="relative">
        <label className="block text-sm mb-1">{t('password')}</label>
        {isEditingPassword ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder={t('enterNewPassword')}
                className="bg-[#FFFACD] text-[#3b3a37] p-2 rounded w-2/3"
                autoFocus
              />
              <button onClick={() => saveField('password')} className="bg-[#FFFACD] text-[#3b3a37] px-3 py-1 rounded">{t('save')}</button>
              <button onClick={() => cancelEdit('password')} className="text-red-500 underline text-sm">{t('cancel')}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value="********"
                readOnly
                className="bg-[#FFFACD] text-[#3b3a37] p-2 rounded-lg w-2/3 cursor-default"
              />
            </div>
            <button onClick={() => setShowPassword(!showPassword)} className="text-xs underline text-[#FFFACD]">{showPassword ? t('hidePassword') : t('showPassword')}</button>
          </div>
        )}
        {!isEditingPassword && (
          <button
            onClick={() => setIsEditingPassword(true)}
            title={t('changePassword')}
            className="absolute top-8 right-0 text-[#FFFACD] hover:shadow-[0_0_8px_#FFFACD] rounded-full"
          >
            <Pencil size={18} />
          </button>
        )}
        {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
      </div>

      {/* Language */}
      <div className="relative">
        <label className="block text-sm mb-1">{t('preferredLanguage')}</label>
        <div className="flex items-center justify-center space-x-2">
          {isEditingLanguage ? (
            <>
              <select
                value={languageValue}
                onChange={(e) => setLanguageValue(e.target.value)}
                className="bg-[#FFFACD] text-[#3b3a37] p-2 rounded"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
              <button onClick={() => saveField('language')} className="bg-[#FFFACD] text-[#3b3a37] px-3 py-1 rounded">{t('save')}</button>
              <button onClick={() => cancelEdit('language')} className="text-red-500 underline text-sm">{t('cancel')}</button>
            </>
          ) : (
            <span>{t(languageValue)}</span>
          )}
        </div>
        {!isEditingLanguage && (
          <button
            onClick={() => setIsEditingLanguage(true)}
            title={t('editLanguage')}
            className="absolute top-5 right-0 text-[#FFFACD] hover:shadow-[0_0_8px_#FFFACD] rounded-full"
          >
            <Pencil size={18} />
          </button>
        )}
        {languageError && <p className="text-red-500 text-xs mt-1">{languageError}</p>}
      </div>
    </div>
  );
}
