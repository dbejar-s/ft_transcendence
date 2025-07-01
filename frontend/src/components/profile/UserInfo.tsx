"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Upload, Eye, EyeOff } from "lucide-react"
import { predefinedAvatars } from "./ProfileUtils"
import { usePlayer } from "../../context/PlayerContext"
import { userService } from "../../services/api"

export default function UserInfo() {
  const { t, i18n } = useTranslation()
  const { player, login } = usePlayer();

  // --- State Management ---
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form values
  const [avatarFile, setAvatarFile] = useState<string | File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameValue, setUsernameValue] = useState("");
  const [languageValue, setLanguageValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Errors
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const resetState = () => {
    if (player) {
      setUsernameValue(player.username);
      setLanguageValue(player.language);
      setAvatarFile(player.avatar);
      setAvatarPreview(null);
      setUsernameError("");
      setPasswordValue("");
      setPasswordError("");
    }
  };

  useEffect(() => {
    resetState();
  }, [player]);

  const handleEditClick = () => {
    resetState();
    setIsEditing(true);
  };
  
  const handleCancelClick = () => {
    setIsEditing(false);
    resetState();
  };

  const handleSave = async () => {
    if (!player) return;
    
    if (usernameValue.length < 3) {
      setUsernameError(t("usernameMinLength"));
      return;
    }
    if (player.googleId === null && passwordValue && passwordValue.length < 6) {
        setPasswordError(t("passwordMinLength"));
        return;
    }
    setUsernameError("");
    setPasswordError("");
    
    setLoading(true);

    const formData = new FormData();
    formData.append('username', usernameValue);
    formData.append('language', languageValue);
    
    if (avatarFile instanceof File) {
        formData.append('avatar', avatarFile, avatarFile.name);
    } else if (typeof avatarFile === 'string') {
        formData.append('predefinedAvatar', avatarFile);
    }
    
    if (passwordValue) {
        formData.append('password', passwordValue);
    }

    try {
        const { user: updatedUser } = await userService.updateProfile(player.id, formData);
        login(updatedUser);
        
        if (i18n.language !== updatedUser.language) {
          i18n.changeLanguage(updatedUser.language);
        }

        setIsEditing(false);
    } catch (error: any) {
        console.error("Save failed:", error);
        setUsernameError(error.message || t('profileSaveError'));
    } finally {
        setLoading(false);
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

  if (!player) {
    return <div>{t('loading')}</div>;
  }

  const getDisplayAvatar = () => {
      if (avatarPreview) return avatarPreview;
      if (avatarFile instanceof File) return URL.createObjectURL(avatarFile);
      if (typeof avatarFile === 'string' && !avatarFile.startsWith('/uploads')) {
          return avatarFile;
      }
      if (player.avatar && player.avatar.startsWith('/uploads')) {
          return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${player.avatar}`;
      }
      return player.avatar;
  }
  
  // FIXED: Added an explicit index signature to the languageMap type.
  const languageMap: { [key: string]: string } = {
      en: "english",
      es: "spanish",
      fr: "french"
  }

  return (
    <div className="bg-[#20201d] text-[#FFFACD] rounded-xl p-6 space-y-6 max-w-lg mx-auto relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-press font-bold text-[#FFFACD]">{t('profile')}</h2>
        {!isEditing && (
          <button onClick={handleEditClick} title={t("editProfile")}
            className="flex items-center gap-2 bg-[#2a2a27] px-3 py-2 rounded font-press text-xs hover:bg-opacity-80">
            <Pencil size={14} />
            {t('edit')}
          </button>
        )}
      </div>

      {isEditing ? (
        // --- EDITING VIEW ---
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
              <img src={getDisplayAvatar()} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-[#FFFACD] object-cover"/>
              <div className="grid grid-cols-4 gap-2">
                  {predefinedAvatars.map((av, index) => (
                      <button key={index} type="button" onClick={() => handlePredefinedAvatarClick(av.src)}
                          className={`w-12 h-12 rounded-full border-2 overflow-hidden ${avatarFile === av.src ? "border-[#FFFACD]" : "border-transparent"}`}>
                          <img src={av.src} alt={av.alt} className="w-full h-full object-cover" />
                      </button>
                  ))}
              </div>
              <label className="cursor-pointer bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-press text-xs flex items-center gap-2">
                  <Upload size={14} /> {t("uploadImage")}
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
          </div>
          
          <div>
              <label className="block text-sm mb-2 font-press opacity-80 text-left">{t("username")}</label>
              <input value={usernameValue} onChange={(e) => setUsernameValue(e.target.value)}
                  className="bg-[#FFFACD] text-[#20201d] p-2 rounded font-press w-full"/>
              {usernameError && <p className="text-red-400 text-xs font-press mt-1 text-left">{usernameError}</p>}
          </div>

          {player.googleId === null && (
            <div>
                <label className="block text-sm mb-2 font-press opacity-80 text-left">{t("changePassword")}</label>
                <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)}
                        placeholder={t('enterNewPassword')}
                        className="bg-[#FFFACD] text-[#20201d] p-2 rounded font-press w-full pr-10"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#20201d]">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                {passwordError && <p className="text-red-400 text-xs font-press mt-1 text-left">{passwordError}</p>}
            </div>
          )}

          <div>
              <label className="block text-sm mb-2 font-press opacity-80 text-left">{t("preferredLanguage")}</label>
              <select value={languageValue} onChange={(e) => setLanguageValue(e.target.value)}
                  className="bg-[#FFFACD] text-[#20201d] p-2 rounded font-press w-full">
                  <option value="en">{t("english")}</option>
                  <option value="fr">{t("french")}</option>
                  <option value="es">{t("spanish")}</option>
              </select>
          </div>

          <div className="flex justify-end gap-4 pt-4">
              <button onClick={handleCancelClick} className="text-gray-400 font-press text-sm hover:text-white">
                  {t("cancel")}
              </button>
              <button onClick={handleSave} disabled={loading}
                  className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-press text-sm hover:bg-opacity-90 disabled:opacity-50">
                  {loading ? t('loading') : t("save")}
              </button>
          </div>
        </div>
      ) : (
        // --- DISPLAY VIEW ---
        <div className="space-y-4 text-left">
            <div className="flex items-center gap-4">
                <img src={getDisplayAvatar()} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-[#FFFACD] object-cover"/>
                <div>
                    <p className="font-press opacity-70 text-xs">{t('username')}</p>
                    <p className="text-xl font-press font-bold">{player.username}</p>
                </div>
            </div>
             <div>
                <p className="font-press opacity-70 text-xs">{t('email')}</p>
                <p className="font-press">{player.email}</p>
            </div>
             <div>
                <p className="font-press opacity-70 text-xs">{t('language')}</p>
                <p className="font-press capitalize">{t(languageMap[player.language] || player.language)}</p>
            </div>
        </div>
      )}
    </div>
  )
}