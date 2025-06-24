import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Search, UserPlus, UserMinus, Clock } from "lucide-react"
import type { Friend } from "./FriendProfile"
import FriendProfile from "./FriendProfile"

const mockFriends: Friend[] = [
  {
    id: "1",
    username: "GameMaster42",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/men1-UBUKSD58QqHNKPzRwIbtHXIS0VfFI9.png",
    status: "online",
    gamesPlayed: 127,
  },
  {
    id: "2",
    username: "PixelWarrior",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/men2-ayoQtOjBQjL8ix8iXJRU5QPewisMM2.png",
    status: "online",
    lastSeen: "2 hours ago",
    gamesPlayed: 89,
  },
  {
    id: "3",
    username: "RetroGamer",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/women1-xVfpB1ftNspiaMZmuBTBqe9J3hIVzq.png",
    status: "offline",
    lastSeen: "1 day ago",
    gamesPlayed: 203,
  },
]

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>(mockFriends)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all")
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const { t } = useTranslation()

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === "all" || friend.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    return status === "online" ? "bg-green-500" : "bg-gray-500"
  }

  const removeFriend = (friendId: string) => {
    setFriends(friends.filter((f) => f.id !== friendId))
    if (selectedFriend?.id === friendId) setSelectedFriend(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <h2 className="text-lg font-press font-bold text-[#FFFACD]">
            {t("friends") || "Friends"} ({friends.length})
          </h2>
        </div>
        <button className="bg-[#FFFACD] text-[#20201d] text-xs px-4 py-2 rounded font-press hover:bg-opacity-90 transition-colors flex items-center gap-2">
          <UserPlus size={16} />
          {t("addFriend") || "Add Friend"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#20201d]" size={16} />
          <input
            type="text"
            placeholder={t("searchFriends") || "Search friends..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#FFFACD] text-[#20201d] text-xs rounded font-press placeholder-[#20201d] placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-[#FFFACD]"
          />
        </div>
        <div className="flex gap-2">
          {["all", "online", "offline"].map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded font-press transition-colors text-xs ${
                filter === key ? "bg-[#FFFACD] text-[#20201d]" : "bg-[#2a2a27] text-[#FFFACD] hover:bg-opacity-80"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {selectedFriend ? (
        <FriendProfile friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
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
                  onClick={() => setSelectedFriend(friend)}
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
