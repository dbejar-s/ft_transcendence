import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

export interface Match {
	id: string
	opponent: string
	opponentAvatar: string
	result: "win" | "loss" | "draw"
	score: string
	gameMode: string
	duration: string
	date: string
  }
  
  export interface Friend {
	id: string
	username: string
	avatar: string
	status: "online" | "offline"
	lastSeen?: string
	gamesPlayed?: number
	recentMatches?: Match[]
  }

interface Props {
  friend: Friend
  onClose: () => void
}

export default function FriendProfile({ friend, onClose }: Props) {
  const { t } = useTranslation()

  return (
    <div className="bg-[#2a2a27] rounded-lg p-6 text-[#FFFACD] font-press">
      <button
		onClick={onClose}
		aria-label={t("closeProfile") || "Close profile"}
		title={t("closeProfile") || "Close profile"}
		className="ml-auto mb-4 p-1 rounded hover:bg-[#FFFACD] hover:text-[#20201d]"
		>
		<X size={20} />
	  </button>
      <div className="flex items-center gap-6">
        <img
          src={friend.avatar}
          alt={friend.username}
          className="w-20 h-20 rounded-full border-2 border-[#FFFACD] object-cover"
        />
        <div>
          <h3 className="text-xl font-bold">{friend.username}</h3>
          <p>
            {friend.status === "online"
              ? t("online")
              : `${t("lastSeen")}: ${friend.lastSeen || "N/A"}`}
          </p>
          <p>{t("gamesPlayed")}: {friend.gamesPlayed || 0}</p>
        </div>
      </div>
    </div>
  )
}
