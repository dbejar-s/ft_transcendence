import { useState } from "react"
import { useTranslation } from "react-i18next"

export default function Game() {
  const { t } = useTranslation()
  const [showOverlay, setShowOverlay] = useState(true)

  return (
    <div className="min-h-screen flex flex-col bg-[#2a2a27] relative overflow-hidden">
      {showOverlay && (
        <div className="absolute inset-0 bg-black bg-opacity-70 z-20 flex flex-col justify-center items-center p-8 text-white text-center">
          <div className="max-w-xl bg-[#55534e] bg-opacity-90 p-6 rounded-xl shadow-lg space-y-4 border border-[#FFFACD]">
            <h2 className="text-2xl font-press text-[#FFFACD]">{t("howToPlayTitle") || "How to Play"}</h2>
            <p className="text-base font-press">
              {t("howToPlayText") || "Use arrow keys or WASD to move your paddle. Score points to win!"}
            </p>
            <button
              onClick={() => setShowOverlay(false)}
              className="font-press text-base bg-[#FFFACD] text-[#20201d] px-6 py-3 rounded-lg border-2 border-transparent hover:border-[#FFFACD] hover:bg-[#20201d] hover:text-[#FFFACD] transition duration-200"
            >
              {t("startGame") || "Start Game"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-press text-[#FFFACD] mb-6">{t("game") || "Game"}</h2>

        {!showOverlay && (
          <div className="w-full max-w-4xl aspect-video bg-[#20201d] border-2 border-[#FFFACD] border-opacity-30 rounded-lg flex items-center justify-center">
            <p className="text-[#FFFACD] font-press text-xl opacity-60">
              {t("gameArea") || "Game will be implemented here"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
