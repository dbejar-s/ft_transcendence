// components/FriendProfile.tsx
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import FriendMatchHistory from "./FriendMatchHistory"
import FriendStatistics from "./FriendStatistics"
import { getAvatarUrl } from "../../utils/avatarUtils"

export interface Match {
  id: string
  opponent: string
  opponentAvatar: string
  result: "win" | "loss"
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
    <div className="bg-[#2a2a27] rounded-lg p-8 text-[#FFFACD] font-press max-w-6xl mx-auto space-y-6">
      <button
        onClick={onClose}
        aria-label={t("closeProfile") || "Close profile"}
        title={t("closeProfile") || "Close profile"}
        className="ml-auto mb-2 p-1 rounded hover:bg-[#FFFACD] hover:text-[#20201d]"
      >
        <X size={20} />
      </button>

      <div className="flex items-center justify-between gap-6">
        <img
          src={getAvatarUrl(friend.avatar)}
          alt={friend.username}
          className="w-20 h-20 rounded-full border-2 border-[#FFFACD] object-cover"
        />

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{friend.username}</h3>
            <p>
              {friend.status === "online"
                ? t("online")
                : `${t("offline")}`}
            </p>
            <p>{t("gamesPlayed")}: {friend.gamesPlayed || 0}</p>
          </div>
        </div>
      </div>

      <FriendMatchHistory recentMatches={friend.recentMatches?.slice(0, 5) || []} />
      <FriendStatistics recentMatches={friend.recentMatches?.slice(0, 20) || []} />
    </div>
  )
}