import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { BarChart3 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Match } from "./FriendProfile"

const COLORS = ['#4ade80', '#f87171']

interface Props {
  recentMatches: Match[]
}

export default function FriendStatistics({ recentMatches }: Props) {
  const { t } = useTranslation()

  if (!recentMatches || recentMatches.length === 0) return null

  const grouped = recentMatches.reduce((acc, match) => {
    if (!acc[match.gameMode]) {
      acc[match.gameMode] = { wins: 0, total: 0 }
    }
    acc[match.gameMode].total++
    if (match.result === "win") acc[match.gameMode].wins++
    return acc
  }, {} as Record<string, { wins: number; total: number }>)

  const gameModesStats = Object.entries(grouped).map(([mode, data]) => ({
    mode,
    games: data.total,
    winRate: parseFloat(((data.wins / data.total) * 100).toFixed(1)),
  }))

  const pieDataForMode = (mode: typeof gameModesStats[0]) => [
    { name: t("wins"), value: mode.winRate },
    { name: t("losses"), value: 100 - mode.winRate },
  ]

  const renderCustomLabel = (t: Function) => ({ name, percent, cx, cy, midAngle, outerRadius }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = percent === 1 ? outerRadius + 40 : outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    let labelColor = '#FFFACD';
    if (name === t("wins")) labelColor = '#32CD32';
    else if (name === t("losses")) labelColor = '#FF6347';

    return (
      <text
        x={x}
        y={y}
        fill={labelColor}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
        fontFamily="Press Start 2P"
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  }

  return (
    <div className="bg-[#2a2a27] rounded-lg p-6 mt-6">
      <h3 className="text-sm font-press font-bold text-[#FFFACD] mb-4 flex items-center gap-2">
        <BarChart3 size={20} />
        {t("performanceByGameMode") || "Performance by Game Mode"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gameModesStats.map((mode, index) => (
          <div key={index} className="bg-[#20201d] rounded-lg p-4 flex flex-col items-center">
            <div className="font-press font-bold text-[#FFFACD] text-sm mb-2">
              {t(mode.mode.toLowerCase()) || mode.mode}
            </div>
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
                  label={renderCustomLabel(t)}
                  labelLine={false}
                >
                  {pieDataForMode(mode).map((_, i) => (
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
            <div className="text-xs font-press text-[#FFFACD] opacity-70 mt-2">
              {t("games")}: {mode.games}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
