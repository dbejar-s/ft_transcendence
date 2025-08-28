import { useState, useEffect } from "react"
import { Calendar, Trophy, Target, Clock, Filter } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Match } from "../../types/Match"

export default function MatchHistory() {
  const [fetchedMatches, setFetchedMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all")
  const [gameModeFilter, setGameModeFilter] = useState<"all" | "Casual" | "Tournament">("all")
  const { t } = useTranslation()

  const fetchMatches = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/matches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      const transformedMatches = data.map((match: any) => ({
        id: match.id,
        opponent: match.opponent,
        opponentAvatar: match.opponentAvatar || '/default-avatar.png',
        result: match.result.toLowerCase() as "win" | "loss",
        score: `${match.player1Score}-${match.player2Score}`,
        gameMode: match.gameMode,
        duration: calculateDuration(match.startedAt, match.endedAt),
        date: match.playedAt
      }))
      
      setFetchedMatches(transformedMatches)
    } catch (error) {
      console.error("Error fetching matches:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  // Add event listener for when a match is completed
  useEffect(() => {
    const handleMatchCompleted = () => {
      console.log('Match completed, refreshing match history...')
      fetchMatches()
    }

    window.addEventListener('matchCompleted', handleMatchCompleted)
    return () => window.removeEventListener('matchCompleted', handleMatchCompleted)
  }, [])

  const filteredMatches = fetchedMatches.filter((match) => {
    const matchesResult = filter === "all" || match.result === filter
    const matchesGameMode = gameModeFilter === "all" || match.gameMode === gameModeFilter
    return matchesResult && matchesGameMode
  })

  const calculateDuration = (start: string, end: string): string => {
    if (!start || !end) return "N/A"
    
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffInSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
    
    const minutes = Math.floor(diffInSeconds / 60)
    const seconds = diffInSeconds % 60
    
    return `${minutes}m ${seconds}s`
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case "win":
        return "text-green-400"
      case "loss":
        return "text-red-400"
      default:
        return "text-[#FFFACD]"
    }
  }

  const getResultBg = (result: string) => {
    switch (result) {
      case "win":
        return "bg-green-600 bg-opacity-20 border-green-600"
      case "loss":
        return "bg-red-600 bg-opacity-20 border-red-600"
      default:
        return "bg-[#2a2a27] border-[#FFFACD]"
    }
  }

  const stats = {
    total: fetchedMatches.length,
    wins: fetchedMatches.filter((m) => m.result === "win").length,
    losses: fetchedMatches.filter((m) => m.result === "loss").length,
  }

  const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex items-center gap-3">
          <Trophy className="text-[#FFFACD]" size={24} />
          <h2 className="text-lg font-press font-bold text-[#FFFACD]">{t("matchHistory") || "Match History"}</h2>
        </div>

        <div className="flex gap-4 text-xs font-press">
          <div className="bg-[#2a2a27] px-3 py-2 rounded">
            <span className="text-[#FFFACD] opacity-70">{t("total") || "Total"}: </span>
            <span className="text-[#FFFACD] font-bold">{stats.total}</span>
          </div>
          <div className="bg-green-600 bg-opacity-20 px-3 py-2 rounded">
            <span className="text-green-400 opacity-70">{t("wins") || "Wins"}: </span>
            <span className="text-green-400 font-bold">{stats.wins}</span>
          </div>
          <div className="bg-red-600 bg-opacity-20 px-3 py-2 rounded">
            <span className="text-red-400 opacity-70">{t("losses") || "Losses"}: </span>
            <span className="text-red-400 font-bold">{stats.losses}</span>
          </div>
          <div className="bg-[#FFFACD] bg-opacity-20 px-3 py-2 rounded">
            <span className="text-[#FFFACD] opacity-70">{t("winRate") || "Win Rate"}: </span>
            <span className="text-[#FFFACD] font-bold">{winRate}%</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#FFFACD]" />
          <span className="font-press text-xs text-[#FFFACD] opacity-70">{t("result") || "Result"}:</span>
          <div className="flex gap-1">
            {[
              { key: "all", label: t("all") || "All" },
              { key: "win", label: t("win") || "Win" },
              { key: "loss", label: t("loss") || "Loss" },
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-3 py-1 rounded font-press text-xs transition-colors ${
                  filter === filterOption.key
                    ? "bg-[#FFFACD] text-[#20201d]"
                    : "bg-[#2a2a27] text-[#FFFACD] hover:bg-opacity-80"
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-press text-xs text-[#FFFACD] opacity-70">{t("mode") || "Mode"}:</span>
          <div className="flex gap-1">
            {[
              { key: "all", label: t("all") || "All" },
              { key: "Casual", label: t("casual") || "Casual" },
              { key: "Tournament", label: t("tournament") || "Tournament" },
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setGameModeFilter(mode.key as any)}
                className={`px-3 py-1 rounded font-press text-xs transition-colors ${
                  gameModeFilter === mode.key
                    ? "bg-[#FFFACD] text-[#20201d]"
                    : "bg-[#2a2a27] text-[#FFFACD] hover:bg-opacity-80"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-[#FFFACD] opacity-60">
            <p className="font-press">{t("loading") || "Loading..."}</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-8 text-[#FFFACD] opacity-60">
            <Trophy size={48} className="mx-auto mb-4" />
            <p className="font-press">{t("noMatchesFound") || "No matches found"}</p>
          </div>
        ) : (
          filteredMatches.map((match) => (
            <div
              key={match.id}
              className={`rounded-lg p-4 border-l-4 ${getResultBg(match.result)} transition-colors hover:bg-opacity-30`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={match.opponentAvatar || "/placeholder.svg"}
                    alt={match.opponent}
                    className="w-10 h-10 rounded-full border-2 border-[#FFFACD] object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-press font-bold text-[#FFFACD]">
                        {t("vs") || "vs"} {match.opponent}
                      </span>
                      <span className={`font-press font-bold text-sm ${getResultColor(match.result)}`}>
                        {t(match.result.toUpperCase()) || match.result.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#FFFACD] opacity-70 font-press">
                      <span className="flex items-center gap-1">
                        <Target size={12} />
                        {match.score}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {match.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(match.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-[#2a2a27] px-3 py-1 rounded font-press text-xs text-[#FFFACD]">
                    {t(match.gameMode.toLowerCase()) || match.gameMode}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
