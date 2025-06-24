import type React from "react"

import { useTranslation } from "react-i18next"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Add actual authentication logic
      console.log("Login with", email, password)
      // On success, navigate to home or profile
      // navigate('/')
    } catch (error) {
      console.error("Login failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // TODO: Add Google Sign-in logic
    console.log("Google Sign-in")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2a2a27] text-[#FFFACD] p-6">
      <div className="bg-[#20201d] p-8 rounded-xl shadow-xl w-full max-w-md border border-[#FFFACD] border-opacity-20">
        <h2 className="text-xl font-press mb-6 text-center">{t("registerTitle") || "Login"}</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder={t("email") || "Email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none focus:ring-2 focus:ring-[#FFFACD]"
            required
          />
          <input
            type="password"
            placeholder={t("password") || "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none focus:ring-2 focus:ring-[#FFFACD]"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFFACD] text-[#20201d] font-press text-base py-3 rounded-lg hover:bg-[#e0e0a0] transition disabled:opacity-50"
          >
            {loading ? t("loading") || "Loading..." : t("login") || "Login"}
          </button>
        </form>

        <div className="my-6 text-center text-xs font-press">
          {t("noAccount") || "Don't have an account?"}{" "}
          <button onClick={() => navigate("/signup")} className="underline hover:text-white transition-colors">
            {t("signUp") || "Sign up"}
          </button>
        </div>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-[#FFFACD] opacity-30" />
          <span className="mx-3 text-xs font-press">{t("or") || "OR"}</span>
          <hr className="flex-grow border-[#FFFACD] opacity-30" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white text-[#20201d] py-3 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
        >
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" className="w-5 h-5" />
          {t("continueWithGoogle") || "Continue with Google"}
        </button>
      </div>
    </div>
  )
}
