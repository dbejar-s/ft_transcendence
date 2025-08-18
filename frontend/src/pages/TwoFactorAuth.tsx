import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authService } from "../services/api";
import { usePlayer } from "../context/PlayerContext";

export default function TwoFactorAuth() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login, setIsLoggedIn } = usePlayer();

  // Retrieve the userId passed from the login page
  const userId = (location.state as { userId: string })?.userId;

  // Handle 2FA form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await authService.verify2FA(userId, code);
      localStorage.setItem("token", res.token);
      if (res.user) {
        login({
          id: res.user.id,
          email: res.user.email,
          username: res.user.username,
          avatar: res.user.avatar,
          language: res.user.language || 'en',
          provider: res.user.googleId ? 'google' : undefined,
        });
      } else {
        // Fallback: minimal login state if user is not returned (shouldn't happen now)
        setIsLoggedIn(true);
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || t("invalidCode") || "Invalid verification code");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2a2a27] text-[#FFFACD] p-6">
      <div className="bg-[#20201d] p-8 rounded-xl shadow-xl w-full max-w-md border border-[#FFFACD] border-opacity-20">
        <h2 className="text-xl font-press mb-6 text-center">
          {"Two-Factor Authentication"}
        </h2>

        <p className="mb-6 text-center text-sm text-[#FFFACD] opacity-80">
          {t("twoFactorDescription") || "Please enter the 6-digit code we sent to your email."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder={t("enterCode") || "Enter 6-digit code"}
            className="w-full p-3 rounded-lg bg-[#FFFACD] text-[#20201d] placeholder-[#777] focus:outline-none focus:ring-2 focus:ring-[#FFFACD] tracking-widest text-center text-lg font-mono"
            required
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#FFFACD] text-[#20201d] font-press text-base py-3 rounded-lg hover:bg-[#e0e0a0] transition"
          >
            {t("Verify") || "Verify Code"}
          </button>
        </form>
      </div>
    </div>
  );
}
