import type React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Upload, User, Globe, Check } from "lucide-react"
import {
  predefinedAvatars,
  handleAvatarUpload,
  submitProfile,
  validateField
} from "../../components/profile/ProfileUtils"
import type { AvatarType } from "../../components/profile/ProfileUtils"

export default function CompleteProfile() {
  const { t, i18n } = useTranslation()
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState<AvatarType>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [language, setLanguage] = useState(i18n.language || "en")
  const [error, setError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState("")
  const [loading, setLoading] = useState(false)

  // Handle username input and validation
  const handleUsernameChange = (value: string) => {
    setUsername(value)
    validateField("username", value, setUsernameError, t)
  }

  // Submit the profile after validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateField("username", username, setUsernameError, t)) return

    const success = await submitProfile(username, language, avatar, setError, setLoading, t)
    if (success) window.location.href = "/home"
  }

  // Determine which avatar to display (preview, predefined, or default)
  const getDisplayAvatar = () => {
    if (previewUrl) return previewUrl
    if (typeof avatar === "string") return avatar
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2a2a27] text-[#FFFACD] p-6">
      <div className="bg-[#20201d] p-6 rounded-xl shadow-2xl w-full max-w-xl border border-[#FFFACD] border-opacity-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-press font-bold mb-2 text-[#FFFACD]">{t("completeProfile")}</h1>
          <div className="w-16 h-1 bg-[#FFFACD] mx-auto rounded-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={20} className="text-[#FFFACD]" />
              <label className="text-sm font-press font-semibold">{t("chooseAvatar")}</label>
            </div>

            {/* Selected Avatar Preview */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-[#FFFACD] bg-[#2a2a27] flex items-center justify-center overflow-hidden">
                  {getDisplayAvatar() ? (
                    <img
                      src={getDisplayAvatar()!}
                      alt="Selected avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={32} className="text-[#FFFACD] opacity-50" />
                  )}
                </div>
                {getDisplayAvatar() && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#20201d] flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Predefined Avatar Grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {predefinedAvatars.map((av) => (
                <button
                  key={av.alt}
                  type="button"
                  onClick={() => {
                    setAvatar(av.src)
                    setPreviewUrl(null)
                    setError(null)
                  }}
                  className={`relative w-16 h-16 rounded-full border-2 overflow-hidden transition-all duration-200 hover:scale-105 ${
                    avatar === av.src
                      ? "border-[#FFFACD] shadow-[0_0_12px_#FFFACD]"
                      : "border-[#FFFACD] border-opacity-30 hover:border-opacity-60"
                  }`}
                >
                  <img src={av.src || "/placeholder.svg"} alt={av.alt} className="w-full h-full object-cover" />
                  {avatar === av.src && (
                    <div className="absolute inset-0 bg-[#FFFACD] bg-opacity-20 flex items-center justify-center">
                      <Check size={16} className="text-[#FFFACD]" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Upload Custom Avatar */}
            <label
              htmlFor="avatar-upload"
              className="flex items-center justify-center gap-2 w-full cursor-pointer bg-[#2a2a27] text-[#FFFACD] text-sm p-3 rounded-lg border border-[#FFFACD] border-opacity-30 hover:border-opacity-60 hover:bg-opacity-80 transition-all duration-200"
            >
              <Upload size={18} />
              <span className="font-press">{t("uploadImage")}</span>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarUpload(e, setAvatar, setPreviewUrl, setError, t)}
              className="hidden"
            />
          </div>

          {/* Username Field */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User size={20} className="text-[#FFFACD]" />
              <label className="text-sm font-press font-semibold">{t("chooseUsername")}</label>
            </div>
            <input
              type="text"
              placeholder={t("chooseUsername")}
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              required
              className={`w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none font-press ${
                usernameError
                  ? "border-2 border-red-500 focus:ring-red-500"
                  : "focus:ring-2 focus:ring-[#FFFACD]"
              }`}
            />
            {usernameError && <p className="text-red-400 font-press">{usernameError}</p>}
          </div>

          {/* Language Dropdown */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-[#FFFACD]" />
              <label className="text-sm font-press font-semibold">{t("preferredLanguage")}</label>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-3 rounded-lg text-[#20201d] bg-[#FFFACD] font-press focus:outline-none focus:ring-2 focus:ring-[#FFFACD]"
            >
              <option value="en">{t("english")}</option>
              <option value="fr">{t("french")}</option>
              <option value="es">{t("spanish")}</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-3">
              <p className="text-red-400 text-sm font-press text-center">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!usernameError || !username.trim()}
            className="w-full bg-[#FFFACD] text-[#20201d] font-press font-bold text-lg py-4 rounded-lg hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-[#20201d] border-t-transparent rounded-full animate-spin"></div>
                {t("loading")}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Check size={20} />
                {t("finish")}
              </div>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[#FFFACD] opacity-60 text-sm font-press">{t("welcomeTitle")}</p>
        </div>
      </div>
    </div>
  )
}
