import { BarChart3, Clock, Trophy, Zap } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

// Type definition for individual stat cards
export interface StatCard {
	title: string;
	value: string;
	change?: string;
	changeType?: "positive" | "negative" | "neutral";
	icon: React.ReactNode;
}

// Pie chart slice colors
const COLORS = ['#4ade80', '#f87171'] // Green for wins, red for losses

export default function Statistics() {
  const { t } = useTranslation()

  // Main stat cards to display at the top
  const stats: StatCard[] = [
    {
      title: t("totalGames") || "Total Games",
      value: "247",
      change: `+12 ${t("thisWeek") || "this week"}`,
      changeType: "positive",
      icon: <BarChart3 size={24} />,
    },
    {
      title: t("winRate") || "Win Rate",
      value: "68.4%",
      change: `+2.1% ${t("thisMonth") || "this month"}`,
      changeType: "positive",
      icon: <Trophy size={24} />,
    },
    {
      title: t("playTime") || "Play Time",
      value: "127h",
      change: `+8h ${t("thisWeek") || "this week"}`,
      changeType: "positive",
      icon: <Clock size={24} />,
    },
    {
      title: t("currentStreak") || "Current Streak",
      value: `7 ${(t("wins") || "wins").toLowerCase()}`,
      change: `${t("personalBest") || "Personal Best"}: 12`,
      changeType: "neutral",
      icon: <Zap size={24} />,
    },
  ]

  // Recent player achievements with rarity classification
  const recentAchievements = [
    {
      name: t("perfectGame") || "Perfect Game",
      description: t("perfectGameDesc") || "Won without losing a single point",
      date: `2 ${t("daysAgo") || "days ago"}`,
      rarity: "rare",
    },
    {
      name: t("speedDemon") || "Speed Demon",
      description: t("speedDemonDesc") || "Won a match in under 5 minutes",
      date: `1 ${t("weekAgo") || "week ago"}`,
      rarity: "common",
    },
    {
      name: t("comebackKing") || "Comeback King",
      description: t("comebackKingDesc") || "Won after being 10 points behind",
      date: `2 ${t("weeksAgo") || "weeks ago"}`,
      rarity: "epic",
    },
  ]

  // Statistics per game mode
  const gameModesStats = [
    { mode: "Casual", games: 156, winRate: 71.2 },
    { mode: "Tournament", games: 91, winRate: 76.9 },
  ]

  // Utility to determine color class based on change type
  const getChangeColor = (type?: string) => {
    switch (type) {
      case "positive":
        return "text-green-400"
      case "negative":
        return "text-red-400"
      case "neutral":
        return "text-[#FFFACD] opacity-70"
      default:
        return "text-[#FFFACD] opacity-70"
    }
  }

  // Utility to style achievements based on rarity
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "border-gray-500 bg-gray-500 bg-opacity-20"
      case "rare":
        return "border-blue-500 bg-blue-500 bg-opacity-20"
      case "epic":
        return "border-purple-500 bg-purple-500 bg-opacity-20"
      default:
        return "border-[#FFFACD] bg-[#FFFACD] bg-opacity-20"
    }
  }

  // Prepare pie chart data for each game mode
  const pieDataForMode = (mode: typeof gameModesStats[0]) => [
    { name: t("wins") || "Wins", value: mode.winRate },
    { name: t("losses") || "Losses", value: parseFloat((100 - mode.winRate).toFixed(1)) },
  ]

  return (
    <div className="space-y-8">
      {/* Section title */}
      <div className="flex items-center gap-3">
        <BarChart3 className="text-[#FFFACD]" size={24} />
        <h2 className="text-lg font-press font-bold text-[#FFFACD]">{t("statistics") || "Statistics"}</h2>
      </div>

      {/* Cards showing total stats */}
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
            {stat.change && (
              <div className={`text-xs font-press ${getChangeColor(stat.changeType)}`}>{stat.change}</div>
            )}
          </div>
        ))}
      </div>

      {/* Performance by Game Mode */}
      <div className="bg-[#2a2a27] rounded-lg p-6">
        <h3 className="text-sm font-press font-bold text-[#FFFACD] mb-4">
          {t("performanceByGameMode") || "Performance by Game Mode"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gameModesStats.map((mode, index) => (
            <div key={index} className="bg-[#20201d] rounded-lg p-4 flex flex-col items-center">
              <div className="font-press font-bold text-[#FFFACD] text-sm mb-2">
                {t(mode.mode.toLowerCase()) || mode.mode}
              </div>

              {/* Pie Chart */}
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
                    {pieDataForMode(mode).map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{ backgroundColor: '#2a2a27', borderRadius: 6 }}
                    itemStyle={{ color: '#FFFACD' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Mode info */}
              <div className="text-xs font-press text-[#FFFACD] opacity-70 mt-2">
                {t("games") || "Games"}: {mode.games}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-[#2a2a27] rounded-lg p-6">
        <h3 className="text-sm font-press font-bold text-[#FFFACD] mb-4 flex items-center gap-2">
          <Trophy size={20} />
          {t("recentAchievements") || "Recent Achievements"}
        </h3>
        <div className="space-y-3">
          {recentAchievements.map((achievement, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${getRarityColor(achievement.rarity)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-press font-bold text-[#FFFACD] text-sm">{achievement.name}</div>
                  <div className="text-xs text-[#FFFACD] opacity-70 font-press">{achievement.description}</div>
                </div>
                <div className="text-xs text-[#FFFACD] opacity-60 font-press">{achievement.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
