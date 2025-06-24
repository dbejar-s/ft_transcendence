"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Upload, Eye, EyeOff } from "lucide-react"
import { predefinedAvatars } from "./ProfileUtils"

interface UserInfoProps {
  avatar: string
  username: string
  email: string
  language: string
}

export default function UserInfo({ avatar, username, email, language }: UserInfoProps) {
  const { t } = useTranslation()

  const [avatarFile, setAvatarFile] = useState<string | File>(avatar)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [usernameValue, setUsernameValue] = useState(username)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState("")

  const [emailValue, setEmailValue] = useState(email)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")

  const [passwordValue, setPasswordValue] = useState("")
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [languageValue, setLanguageValue] = useState(language)
  const [isEditingLanguage, setIsEditingLanguage] = useState(false)

  const validateField = (field: string, value: string) => {
    if (field === "username") {
      if (value.length < 3) return t("usernameMinLength")
      if (value.length > 20) return t("usernameMaxLength")
    }
    if (field === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) return t("invalidEmail")
    }
    if (field === "password") {
      if (value.length < 6) return t("passwordMinLength")
    }
    return ""
  }

  const saveField = async (field: "username" | "email" | "language" | "password") => {
    let value = ""
    if (field === "username") value = usernameValue
    else if (field === "email") value = emailValue
    else if (field === "language") value = languageValue
    else if (field === "password") value = passwordValue

    const error = validateField(field, value)
    if (error) {
      if (field === "username") setUsernameError(error)
      else if (field === "email") setEmailError(error)
      else if (field === "password") setPasswordError(error)
      return
    }

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (field === "username") {
        setIsEditingUsername(false)
        setUsernameError("")
      } else if (field === "email") {
        setIsEditingEmail(false)
        setEmailError("")
      } else if (field === "language") {
        setIsEditingLanguage(false)
      } else if (field === "password") {
        setIsEditingPassword(false)
        setPasswordValue("")
        setShowPassword(false)
        setPasswordError("")
      }
    } catch (error) {
      console.error("Save failed:", error)
    }
  }

  const cancelEdit = (field: "username" | "email" | "language" | "password") => {
    if (field === "username") {
      setIsEditingUsername(false)
      setUsernameError("")
      setUsernameValue(username)
      setAvatarFile(avatar)
      setAvatarPreview(null)
    }
    if (field === "email") {
      setIsEditingEmail(false)
      setEmailError("")
      setEmailValue(email)
    }
    if (field === "language") {
      setIsEditingLanguage(false)
      setLanguageValue(language)
    }
    if (field === "password") {
      setIsEditingPassword(false)
      setPasswordError("")
      setPasswordValue("")
      setShowPassword(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePredefinedAvatarClick = (avatarPath: string) => {
    setAvatarFile(avatarPath)
    setAvatarPreview(avatarPath)
  }

  return (
    <div className="bg-[#20201d] text-[#FFFACD] rounded-xl p-6 space-y-6 max-w-md mx-auto text-center relative">
      {/* Avatar + Username */}
      <div className="relative flex flex-col items-center space-y-4">
        <img
          src={
            avatarPreview ||
            (typeof avatarFile === "string" ? avatarFile : avatarFile ? URL.createObjectURL(avatarFile) : avatar)
          }
          alt="Avatar"
          className="w-20 h-20 rounded-full border-2 border-[#FFFACD] object-cover"
        />

        {isEditingUsername ? (
          <div className="flex flex-col items-center space-y-4 w-full">
            <div className="grid grid-cols-2 gap-3 justify-center">
              {predefinedAvatars.map((av, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handlePredefinedAvatarClick(av.src)}
                  className={`w-16 h-16 rounded-full border-2 cursor-pointer hover:border-[#FFFACD] transition-colors overflow-hidden ${
                    avatarPreview === av.src ? "border-[#FFFACD]" : "border-[#2a2a27]"
                  }`}
                >
                  <img src={av.src || "/placeholder.svg"} alt={av.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <label className="cursor-pointer bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-press text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2">
              <Upload size={16} />
              {t("uploadImage")}
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>

            <input
              value={usernameValue}
              onChange={(e) => setUsernameValue(e.target.value)}
              placeholder={t("chooseNewUsername")}
              className="bg-[#FFFACD] text-[#20201d] p-2 rounded text-center font-press w-full max-w-xs"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => saveField("username")}
                className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-press hover:bg-opacity-90 transition-colors"
              >
                {t("save")}
              </button>
              <button
                onClick={() => cancelEdit("username")}
                className="text-red-400 underline text-sm font-press hover:text-red-300 transition-colors"
              >
                {t("cancel")}
              </button>
            </div>

            {usernameError && <p className="text-red-400 text-xs font-press">{usernameError}</p>}
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-press font-bold">{usernameValue}</h3>
            <button
              onClick={() => setIsEditingUsername(true)}
              title={t("editUsername")}
              className="absolute top-20 right-0 text-[#FFFACD] hover:text-white transition-colors p-1 rounded-full hover:bg-[#FFFACD] hover:bg-opacity-20"
            >
              <Pencil size={18} />
            </button>
          </>
        )}
      </div>

      {/* Email */}
      <div className="relative">
        <label className="block text-sm mb-2 font-press opacity-80">{t("email")}</label>
        <div className="flex justify-center items-center space-x-2">
          {isEditingEmail ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="bg-[#FFFACD] text-[#20201d] p-2 rounded font-press w-full max-w-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveField("email")}
                  className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-press hover:bg-opacity-90 transition-colors"
                >
                  {t("save")}
                </button>
                <button
                  onClick={() => cancelEdit("email")}
                  className="text-red-400 underline text-sm font-press hover:text-red-300 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
              {emailError && <p className="text-red-400 text-xs font-press">{emailError}</p>}
            </div>
          ) : (
            <span className="font-press truncate max-w-xs">{emailValue}</span>
          )}
        </div>
        {!isEditingEmail && (
          <button
            onClick={() => setIsEditingEmail(true)}
            title={t("editEmail")}
            className="absolute top-8 right-0 text-[#FFFACD] hover:text-white transition-colors p-1 rounded-full hover:bg-[#FFFACD] hover:bg-opacity-20"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>

      {/* Password */}
      <div className="relative">
        <label className="block text-sm mb-2 font-press opacity-80">{t("password")}</label>
        {isEditingPassword ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="relative w-full max-w-xs">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder={t("enterNewPassword")}
                className="bg-[#FFFACD] text-[#20201d] p-2 rounded font-press w-full pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#20201d] hover:text-opacity-70"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveField("password")}
                className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-press hover:bg-opacity-90 transition-colors"
              >
                {t("save")}
              </button>
              <button
                onClick={() => cancelEdit("password")}
                className="text-red-400 underline text-sm font-press hover:text-red-300 transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
            {passwordError && <p className="text-red-400 text-xs font-press">{passwordError}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="font-press">••••••••</span>
          </div>
        )}
        {!isEditingPassword && (
          <button
            onClick={() => setIsEditingPassword(true)}
            title={t("changePassword")}
            className="absolute top-8 right-0 text-[#FFFACD] hover:text-white transition-colors p-1 rounded-full hover:bg-[#FFFACD] hover:bg-opacity-20"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>

      {/* Language */}
      <div className="relative">
        <label className="block text-sm mb-2 font-press opacity-80">{t("preferredLanguage")}</label>
        <div className="flex items-center justify-center space-x-2">
          {isEditingLanguage ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <select
                value={languageValue}
                onChange={(e) => setLanguageValue(e.target.value)}
                className="bg-[#FFFACD] text-[#20201d] p-2 rounded font-press"
              >
                <option value="en">{t("english")}</option>
                <option value="fr">{t("french")}</option>
                <option value="es">{t("spanish")}</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => saveField("language")}
                  className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-press hover:bg-opacity-90 transition-colors"
                >
                  {t("save")}
                </button>
                <button
                  onClick={() => cancelEdit("language")}
                  className="text-red-400 underline text-sm font-press hover:text-red-300 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <span className="font-press">
              {languageValue === "en"
                ? t("english")
                : languageValue === "fr"
                  ? t("french")
                  : languageValue === "es"
                    ? t("spanish")
                      : languageValue}
            </span>
          )}
        </div>
        {!isEditingLanguage && (
          <button
            onClick={() => setIsEditingLanguage(true)}
            title={t("editLanguage")}
            className="absolute top-8 right-0 text-[#FFFACD] hover:text-white transition-colors p-1 rounded-full hover:bg-[#FFFACD] hover:bg-opacity-20"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
