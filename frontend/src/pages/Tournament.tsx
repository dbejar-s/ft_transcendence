import { useTranslation } from "react-i18next"

export default function Tournament() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col bg-[#2a2a27] p-6">
      <div className="max-w-6xl mx-auto w-full">
        <h2 className="text-xl font-press text-[#FFFACD] text-center mb-8">{t("tournaments") || "Tournaments"}</h2>

        <div className="bg-[#20201d] rounded-xl p-8 border border-[#FFFACD] border-opacity-20">
          <div className="text-center">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-lg font-press text-[#FFFACD] mb-4">
              {t("tournamentComingSoon") || "Tournament System Coming Soon"}
            </h3>
            <p className="text-lg font-press text-[#FFFACD] opacity-80">
              {t("tournamentDescription") || "Compete against players worldwide in epic Pong tournaments!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
