import type React from "react"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { signInWithGoogle } from "../firebase"
import { authService } from "../services/api"
import { usePlayer } from "../context/PlayerContext"

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = usePlayer() // use login() instead of setIsLoggedIn
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false) // will actually be used
  const [error, setError] = useState<string | null>(null)

  // Handle regular login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authService.login(email, password)

      // If backend responds with userId for 2FA
      if (res.userId) {
        setLoading(false)
        navigate("/2fa", { state: { userId: res.userId } })
        return
      }

      // Normal login
      localStorage.setItem("token", res.token)
      login(res.user) // Call context login
      navigate("/")
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  // Handle Google login
  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithGoogle()
      const googleUser = result.user

      const googleUserData = {
        token: await googleUser.getIdToken(),
        email: googleUser.email,
        name: googleUser.displayName,
        sub: googleUser.uid,
        picture: googleUser.photoURL,
      }

      const { user } = await authService.handleGoogleLogin(googleUserData)
      login(user)
      navigate("/")
    } catch (error: any) {
      console.error("Google Sign-in failed:", error)
      setError(error.message || "Google login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2a2a27] text-[#FFFACD] p-6">
      <div className="bg-[#20201d] p-8 rounded-xl shadow-xl w-full max-w-md border border-[#FFFACD] border-opacity-20">
        <h2 className="text-xl font-press mb-6 text-center">
          {t("registerTitle") || "Login"}
        </h2>

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

          {/* Error display */}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFFACD] text-[#20201d] font-press text-base py-3 rounded-lg hover:bg-[#e0e0a0] transition disabled:opacity-50"
          >
            {loading
              ? t("loading") || "Loading..."
              : t("login") || "Login"}
          </button>
        </form>

        <div className="my-6 text-center text-xs font-press">
          {t("noAccount") || "Don't have an account?"}{" "}
          <button
            onClick={() => navigate("/signup")}
            className="underline hover:text-white transition-colors"
          >
            {t("signUp") || "Sign up"}
          </button>
        </div>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-[#FFFACD] opacity-30" />
          <span className="mx-3 text-xs font-press">
            {t("or") || "OR"}
          </span>
          <hr className="flex-grow border-[#FFFACD] opacity-30" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-[#20201d] py-3 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google logo"
            className="w-5 h-5"
          />
          {t("continueWithGoogle") || "Continue with Google"}
        </button>
      </div>
    </div>
  )
}