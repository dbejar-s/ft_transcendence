import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import Arcade from "../assets/Home/Arcade.png"

interface HomeProps {
  showLogoutMsg: boolean
  setShowLogoutMsg: (value: boolean) => void
  onNavigateToGame?: () => void
}

export default function Home({ showLogoutMsg, setShowLogoutMsg }: HomeProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (showLogoutMsg) {
      setShowLogoutMsg(false)
      alert(t("logoutMessage"))
    }
  }, [showLogoutMsg, setShowLogoutMsg, t])


  return (
    <div className="min-h-screen flex flex-col bg-[#2a2a27]">
      <main className="flex flex-col lg:flex-row justify-center items-center flex-grow px-4 gap-8 py-4">
        <div className="w-full lg:w-2/3 flex justify-center mb-8 lg:mb-0">
          <div
            className="bg-[#20201d] p-8 rounded-lg shadow-lg flex flex-col justify-center items-center border-2 border-[#FFFACD] border-opacity-20 relative overflow-hidden"
            style={{
              maxWidth: "1300px",
              maxHeight: "900px",
              width: "100%",
              aspectRatio: "1300 / 900",
            }}
          >
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="h-full w-full bg-gradient-to-b from-transparent via-[#FFFACD] to-transparent bg-repeat-y"></div>
            </div>

            <div className="relative w-full h-full flex flex-col justify-center items-center z-10">
              <div
                className="absolute bg-[#FFFACD] bg-opacity-20 rounded-sm"
                style={{
                  top: "20px",
                  left: "3px",
                  width: "4px",
                  height: "23%",
                }}
              ></div>
              <div
                className="absolute bg-[#FFFACD] bg-opacity-20 rounded-sm"
                style={{
                  bottom: "70px",
                  right: "4px",
                  width: "4px",
                  height: "23%",
                }}
              ></div>
              <div
                className="absolute border-l-2 border-dashed border-[#FFFACD] opacity-15"
                style={{
                  top: "-20px",
                  bottom: "-20px",
                  left: "50%",
                  transform: "translateX(-1px)",
                }}
              ></div>
              <div
                className="absolute bg-[#FFFACD] bg-opacity-30 rounded-full animate-pulse"
                style={{
                  width: "5%",
                  aspectRatio: "1 / 1",
                  right: "50px",
                  bottom: "150px",
                }}
              ></div>

              <div className="relative mb-8">
                <h2 className="text-[#FFFACD] text-3xl font-press font-bold text-center tracking-wider relative z-10">
                  {t("welcomeTitle") || "WELCOME TO TRANSCENPONG"}
                </h2>
                <h2 className="text-red-500 text-3xl font-press font-bold text-center tracking-wider absolute top-0 left-0 opacity-50 transform translate-x-1">
                  {t("welcomeTitle") || "WELCOME TO TRANSCENPONG"}
                </h2>
              </div>

              <p className="text-lg text-center font-press text-[#FFFACD] opacity-90 mb-8 max-w-[800px] leading-relaxed">
                {t("welcomeDescription") || "Compete in tournaments, challenge friends in intense pong battles!"}
              </p>

              {/* <button
                onClick={handlePlayNow}
                aria-label={t("playNowAria") || "Start playing the game"}
                className="group relative font-press text-lg bg-[#FFFACD] text-[#20201d] px-8 py-4 rounded-lg border-4 border-[#FFFACD] hover:bg-[#20201d] hover:text-[#FFFACD] transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-[#FFFACD]/50"
              >
                <span className="relative z-10">🎮 {t("playNow") || "PLAY NOW"}</span>
                <div className="absolute inset-0 bg-[#FFFACD] opacity-20 rounded-lg blur-sm group-hover:opacity-40 transition-opacity"></div>
              </button> */}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/3 flex justify-center">
		  <div className="w-full h-full bg-[#2a2a27] rounded flex flex-col items-center justify-center relative overflow-hidden">
			  <img
			  src={Arcade}
			  alt={t('arcadeAlt')}
			  className="max-w-[530px] max-h-[800px] w-full h-auto object-contain"
			  style={{ aspectRatio: '530 / 800' }}
			  />
		  </div>
        </div>
      </main>
    </div>
  )
}