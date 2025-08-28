import { Calendar, Trophy, Target, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Match } from "./FriendProfile"

interface Props {
  recentMatches: Match[]
}

export default function FriendMatchHistory({ recentMatches }: Props) {
  const { t } = useTranslation()

  if (!recentMatches || recentMatches.length === 0) return null

  const getResultColor = (result: string) =>
    result === "win" ? "text-green-400" : "text-red-400"

  const getResultBg = (result: string) =>
    result === "win"
      ? "bg-green-600 bg-opacity-20 border-green-600"
      : "bg-red-600 bg-opacity-20 border-red-600"

  return (
    <div className="mt-6 bg-[#2a2a27] rounded-lg p-6 space-y-3">
      <h3 className="text-sm font-press font-bold text-[#FFFACD] mb-4 flex items-center gap-2">
        <Trophy size={20} />
        {t("lastMatches") || "Last Matches"}
      </h3>

      {recentMatches.map((match) => (
        <div
          key={match.id}
          className={`rounded-lg p-4 border-l-4 ${getResultBg(match.result)} transition-colors hover:bg-opacity-30`}
        >
          <div className="flex items-center gap-4">
            <img
              src={match.opponentAvatar || '/default-avatar.svg'}
              alt={match.opponent}
              className="w-10 h-10 rounded-full border-2 border-[#FFFACD] object-cover"
            />
            <div>
              <div className="flex items-center gap-3">
                <span className="font-press font-bold text-[#FFFACD]">
                  {t("vs")} {match.opponent}
                </span>
                <span className={`font-press font-bold text-sm ${getResultColor(match.result)}`}>
                  {t(match.result.toUpperCase())}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#FFFACD] opacity-70 font-press">
                <span className="flex items-center gap-1"><Target size={12} />{match.score}</span>
                <span className="flex items-center gap-1"><Clock size={12} />{match.duration}</span>
                <span className="flex items-center gap-1"><Calendar size={12} />{new Date(match.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
