import { BarChart3, Clock, Trophy, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { statisticsService } from "../../services/api"

// Couleurs pour le pie chart
const COLORS = ['#4ade80', '#f87171'] // vert = victoires, rouge = défaites

export default function Statistics({ userId }: { userId: string }) {
  const { t } = useTranslation()

  // Stats globales
  const [statsData, setStatsData] = useState<{
    totalGames: number
    wins: number
    playTime: number
    currentStreak: number
    modes: { mode: string; games: number; wins: number }[]
  } | null>(null)

  useEffect(() => {
    statisticsService.getUserStats(userId)
      .then(data => setStatsData(data))
      .catch(console.error)
  }, [userId])

  // Fonction utilitaire pour le pie chart
  const pieDataForMode = (mode: { games: number; wins: number }) => [
    { name: t("wins") || "Wins", value: mode.wins },
    { name: t("losses") || "Losses", value: mode.games - mode.wins },
  ]

  // Couleur des changements (si tu veux afficher des variations)
  // const getChangeColor = (type?: string) => {
  //   switch (type) {
  //     case "positive": return "text-green-400"
  //     case "negative": return "text-red-400"
  //     case "neutral": return "text-[#FFFACD] opacity-70"
  //     default: return "text-[#FFFACD] opacity-70"
  //   }
  // }

  // Préparer les cartes statistiques
  const stats = [
    {
      title: t("totalGames") || "Total Games",
      value: statsData ? statsData.totalGames.toString() : "...",
      icon: <BarChart3 size={24} />,
    },
    {
      title: t("winRate") || "Win Rate",
      value: statsData ? `${((statsData.wins / statsData.totalGames) * 100).toFixed(1)}%` : "...",
      icon: <Trophy size={24} />,
    },
    {
      title: t("playTime") || "Play Time",
      value: statsData ? `${Math.floor(statsData.playTime / 3600)}h` : "...",
      icon: <Clock size={24} />,
    },
    {
      title: t("currentStreak") || "Current Streak",
      value: statsData ? statsData.currentStreak.toString() : "...",
      icon: <Zap size={24} />,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Titre section */}
      <div className="flex items-center gap-3">
        <BarChart3 className="text-[#FFFACD]" size={24} />
        <h2 className="text-lg font-press font-bold text-[#FFFACD]">{t("statistics") || "Statistics"}</h2>
      </div>

      {/* Cartes stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[#2a2a27] rounded-lg p-6 hover:bg-opacity-80 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#FFFACD] opacity-80">{stat.icon}</div>
              <div className="text-right">
                <div className="text-base font-press font-bold text-[#FFFACD]">{stat.value}</div>
                <div className="text-xs font-press text-[#FFFACD] opacity-70">{stat.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats par mode de jeu */}
      <div className="bg-[#2a2a27] rounded-lg p-6">
        <h3 className="text-sm font-press font-bold text-[#FFFACD] mb-4">
          {t("performanceByGameMode") || "Performance by Game Mode"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statsData?.modes.map((mode, index) => (
            <div key={index} className="bg-[#20201d] rounded-lg p-4 flex flex-col items-center">
              <div className="font-press font-bold text-[#FFFACD] text-sm mb-2">
                {t(mode.mode.toLowerCase()) || mode.mode}
              </div>

              {/* Pie chart */}
              <ResponsiveContainer width={400} height={200}>
                <PieChart>
                  <Pie
                    data={pieDataForMode(mode)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={30}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name}: ${(percent! * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieDataForMode(mode).map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    contentStyle={{ backgroundColor: '#2a2a27', borderRadius: 6 }}
                    itemStyle={{ color: '#FFFACD' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Infos mode */}
              <div className="text-xs font-press text-[#FFFACD] opacity-70 mt-2">
                {t("games") || "Games"}: {mode.games}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
