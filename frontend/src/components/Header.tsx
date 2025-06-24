import { useTranslation } from "react-i18next"
import { LogOut } from "lucide-react"

interface HeaderProps {
  isLoggedIn: boolean
  setIsLoggedIn: (value: boolean) => void
  setShowLogoutMsg: (value: boolean) => void
  onNavigate: (page: string) => void
}

export default function Header({ isLoggedIn, setIsLoggedIn, setShowLogoutMsg, onNavigate }: HeaderProps) {
  const { t, i18n } = useTranslation()

  const guestLinks = [
    { path: "register", label: t("register") },
    { path: "about", label: t("about") },
  ]

  const userLinks = [
    { path: "game", label: t("game") },
    { path: "tournament", label: t("tournaments") },
    { path: "profile", label: t("profile") },
  ]

  const handleLogout = () => {
    const confirmed = window.confirm(t("logoutConfirm"))
    if (confirmed) {
      setIsLoggedIn(false)
      setShowLogoutMsg(true)
      onNavigate("home")
    }
  }

  const changeLanguage = (lng: string) => i18n.changeLanguage(lng)

  return (
    <header className="flex justify-between items-center py-4 px-6 bg-[#2a2a27] border-b-2 border-[#FFFACD] border-opacity-20">
      <button onClick={() => onNavigate("home")} className="no-underline group">
        <h1 className="font-press text-[#FFFACD] text-3xl lg:text-4xl hover:text-opacity-80 transition-colors tracking-wider relative">
          TRANSCENPONG
        </h1>
      </button>

      <nav className="flex items-center gap-4 text-l lg:text-l font-press text-[#FFFACD]">
        {(isLoggedIn ? userLinks : guestLinks).map(({ path, label }) => (
          <button
            key={path}
            onClick={() => onNavigate(path)}
            className="px-4 py-2 transition-all duration-200 rounded-lg border-2 border-transparent hover:border-[#FFFACD] hover:text-cyan-400 bg-transparent transform hover:scale-105"
          >
            {label}
          </button>
        ))}

        {isLoggedIn && (
          <div
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-0.5 rounded-lg hover:border-[#FFFACD] hover:border-2 transition cursor-pointer"
            style={{ color: "#FFFACD", backgroundColor: "transparent" }}
            aria-label={t("logout")}
          >
            <LogOut size={28} />
          </div>
        )}

        <div className="flex items-center gap-2 ml-4 text-xl">
          <button
            onClick={() => changeLanguage("en")}
            aria-label="English"
            className="hover:scale-110 transition-transform"
          >
            🇬🇧
          </button>
          <button
            onClick={() => changeLanguage("fr")}
            aria-label="Français"
            className="hover:scale-110 transition-transform"
          >
            🇫🇷
          </button>
          <button
            onClick={() => changeLanguage("es")}
            aria-label="Español"
            className="hover:scale-110 transition-transform"
          >
            🇪🇸
          </button>
        </div>
      </nav>
    </header>
  )
}
