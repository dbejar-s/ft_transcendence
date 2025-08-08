import { useEffect, useState } from "react"
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
	friendId: string
	userId: string
	onClose: () => void
}

export default function FriendProfile({ friendId, userId, onClose }: Props) {
	const { t } = useTranslation()
	const [friend, setFriend] = useState<Friend | null>(null)

	useEffect(() => {
		const fetchFriend = async () => {
			const res = await fetch(`/api/friends/${userId}/${friendId}`)
			const data = await res.json()
			setFriend(data)
		}
		fetchFriend()
	}, [friendId, userId])

	if (!friend) return <div>{t("loading")}</div>

	return (
		<div className="bg-[#2a2a27] rounded-lg p-6 text-[#FFFACD] font-press">
			<button
				onClick={onClose}
				aria-label={t("closeProfile")}
				title={t("closeProfile")}
				className="ml-auto mb-4 p-1 rounded hover:bg-[#FFFACD] hover:text-[#20201d]"
			>
				<X size={20} />
			</button>

			<div className="flex items-center gap-6 mb-4">
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

			{friend.recentMatches?.length ? (
				<div>
					<h4 className="text-lg mb-2">{t("recentMatches")}</h4>
					<ul className="space-y-2">
						{friend.recentMatches.map((match) => (
							<li key={match.id} className="border p-2 rounded">
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-3">
										<img src={match.opponentAvatar} alt={match.opponent} className="w-10 h-10 rounded-full" />
										<div>
											<p className="font-bold">{match.opponent}</p>
											<p className="text-sm text-gray-300">{t(match.result)} • {match.score}</p>
										</div>
									</div>
									<div className="text-right text-sm">
										<p>{match.gameMode}</p>
										<p>{match.date}</p>
									</div>
								</div>
							</li>
						))}
					</ul>
				</div>
			) : (
				<p className="mt-4">{t("noRecentMatches")}</p>
			)}
		</div>
	)
}
