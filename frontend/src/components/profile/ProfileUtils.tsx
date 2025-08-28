import type React from "react"
import i18n from "i18next"

export const DEFAULT_AVATAR = "/default-avatar.svg"

export const predefinedAvatars = [
  { src: "/assets/Profile/women1.png", alt: "women1" },
  { src: "/assets/Profile/women2.png", alt: "women2" },
  { src: "/assets/Profile/men1.png", alt: "men1" },
  { src: "/assets/Profile/men2.png", alt: "men2" },
]

// Types
export type AvatarType = string | File | null

// Avatar handling functions
export const handleAvatarUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  setAvatar: (avatar: AvatarType) => void,
  setPreviewUrl: (url: string | null) => void,
  setError: (error: string | null) => void,
  t: (key: string) => string,
) => {
  const file = e.target.files?.[0]

  if (!file) {
    setAvatar(null)
    setPreviewUrl(null)
    return
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    setError(t("invalidImageFormat") || "Only image files are allowed.")
    setAvatar(null)
    setPreviewUrl(null)
    return
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    setError(t("imageTooLarge") || "Image size exceeds 2 MB.")
    setAvatar(null)
    setPreviewUrl(null)
    return
  }

  // Set the valid file
  setError(null)
  setAvatar(file)

  // Create preview
  const reader = new FileReader()
  reader.onloadend = () => {
    setPreviewUrl(reader.result as string)
  }
  reader.readAsDataURL(file)
}

// Profile submission function
export const submitProfile = async (
  username: string,
  language: string,
  avatar: AvatarType,
  setError: (error: string | null) => void,
  setLoading: (loading: boolean) => void,
  t: (key: string) => string,
) => {
  setError(null)
  setLoading(true)

  try {
    const formData = new FormData()
    formData.append("username", username)
    formData.append("language", language)

    if (avatar instanceof File) {
      formData.append("avatar", avatar)
    } else if (typeof avatar === "string") {
      formData.append("avatarUrl", avatar)
    }

    const res = await fetch("https://localhost:3001/api/users/complete-profile", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: formData,
    })

    if (!res.ok) throw new Error("Username already taken or other error")

    i18n.changeLanguage(language)
    return true
  } catch (err) {
    setError(t("profileCompletionError") || "Could not complete profile.")
    return false
  } finally {
    setLoading(false)
  }
}

// Validation functions
export const validateField = (
  field: "username" | "email" | "password" | "language",
  value: string,
  setError: (error: string) => void,
  t: (key: string) => string,
): boolean => {
  if (field === "username") {
    if (!value.trim()) {
      setError(t("usernameRequired") || "Username is required")
      return false
    }
    if (value.length < 3) {
      setError(t("usernameMinLength") || "Username must be at least 3 characters")
      return false
    }
    if (value.length > 20) {
      setError(t("usernameMaxLength") || "Username must be less than 20 characters")
      return false
    }
    setError("")
    return true
  }

  if (field === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setError(t("invalidEmail") || "Invalid email format")
      return false
    }
    setError("")
    return true
  }

  if (field === "password") {
    if (value.length < 6) {
      setError(t("passwordMinLength") || "Password must be at least 6 characters")
      return false
    }
    setError("")
    return true
  }

  if (field === "language") {
    if (value.trim() === "") {
      setError(t("languageRequired") || "Language is required")
      return false
    }
    setError("")
    return true
  }

  return true
}

// Fake API update for testing
export async function fakeApiUpdate(field: string, value: string | File) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Updated ${field}:`, value)
      resolve(true)
    }, 500)
  })
}
