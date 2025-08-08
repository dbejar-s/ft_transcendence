import { useEffect, useState } from "react"
import { Search, UserPlus, UserMinus, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Friend } from "./FriendProfile"
import FriendProfile from "./FriendProfile"

interface Props {
  userId: string // ID du user connecté
}

export default function Friends({ userId }: Props) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all")
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await fetch(`/api/friends/${userId}`)
        const data = await res.json()
        setFriends(data)
      } catch (err) {
        console.error("Failed to fetch friends", err)
      }
    }

    fetchFriends()
  }, [userId])

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === "all" || friend.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    return status === "online" ? "bg-green-500" : "bg-gray-500"
  }

  const removeFriend = async (friendId: string) => {
    try {
      await fetch(`/api/friends/${userId}/${friendId}`, { method: "DELETE" })
      setFriends(friends.filter((f) => f.id !== friendId))
      if (selectedFriendId === friendId) setSelectedFriendId(null)
    } catch (err) {
      console.error("Failed to remove friend", err)
    }
  }

  return (
    <div className="space-y-6">
      {/* ... Header, Search, Filter Buttons ... */}

      {selectedFriendId ? (
        <FriendProfile
          userId={userId}
          friendId={selectedFriendId}
          onClose={() => setSelectedFriendId(null)}
        />
      ) : (
        <div className="space-y-3">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-[#FFFACD] opacity-60">
              <div className="text-2xl mb-4">👥</div>
              <p className="font-press">
                {searchTerm ? t("noFriendsFound") : t("noFriendsDisplay")}
              </p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="bg-[#2a2a27] rounded-lg p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors"
              >
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setSelectedFriendId(friend.id)}
                >
                  <div className="relative">
                    <img
                      src={friend.avatar}
                      alt={friend.username}
                      className="w-12 h-12 rounded-full border-2 border-[#FFFACD] object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#2a2a27] ${getStatusColor(friend.status)}`} />
                  </div>
                  <div>
                    <h3 className="font-press font-bold text-[#FFFACD] text-sm">{friend.username}</h3>
                    <div className="flex items-center gap-1 text-xs text-[#FFFACD] opacity-70 font-press">
                      {friend.status === "online" ? (
                        <span className="text-green-400">{t("online")}</span>
                      ) : (
                        <>
                          <Clock size={12} />
                          <span>{t("lastSeen")}: {friend.lastSeen || "-"}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFriend(friend.id)}
                  className="text-[#FFFACD] hover:text-red-500"
                  title={t("removeFriend") || "Remove friend"}
                >
                  <UserMinus size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
