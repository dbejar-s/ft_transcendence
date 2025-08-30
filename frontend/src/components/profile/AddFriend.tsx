// components/profile/AddFriend.tsx
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import FriendMatchHistory from "./FriendMatchHistory"
import FriendStatistics from "./FriendStatistics"
import { getAvatarUrl } from "../../utils/avatarUtils"
import { apiFetch } from "../../services/api"

// ------------------ TYPES ------------------
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

// ------------------ COMPONENT PROPS ------------------
interface Props {
  userId: string
  onClose: () => void
  onFriendAdded: (friend: Friend) => void
}

// ------------------ COMPONENT ------------------
export default function AddFriendOverlay({ userId, onClose, onFriendAdded }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Friend | null>(null)
  const { t } = useTranslation()

  // ------------------ LOAD USER DETAILS ------------------
  const loadUserDetails = async (user: Friend) => {
    try {
      // First set the selected user with basic info
      setSelected(user);
      
      // Then load detailed info with matches using the user profile route
      const detailedData = await apiFetch(`/api/users/${user.id}/profile`);
      setSelected(detailedData);
      // If the details request fails, we still keep the basic user info
    } catch (error) {
      console.error('Error loading user details:', error);
      // Keep the basic user info even if details fail
    }
  }

  // ------------------ EFFECT: SEARCH USERS ------------------
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const fetchUsers = async () => {
      try {
        setLoading(true)
        const data: Friend[] = await apiFetch(`/api/users/${userId}/friends/search?q=${encodeURIComponent(query)}`)
        setResults(data)
      } catch (err) {
        console.error("Error fetching users:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [query, userId])

  // ------------------ HANDLE ADD FRIEND ------------------
  // Force re-fetch after adding/removing a friend
  const refreshSearch = async () => {
    if (!query.trim()) return;
    try {
      const data: Friend[] = await apiFetch(`/api/users/${userId}/friends/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriend = async (friend: Friend) => {
    try {
      await apiFetch(`/api/users/${encodeURIComponent(userId)}/friends/${encodeURIComponent(friend.id)}`, { 
        method: "POST" 
      });

      onFriendAdded(friend)
      refreshSearch()
      onClose()
    } catch (err: any) {
      console.error("Error adding friend:", err)
      
      // Show more specific error messages
      if (err.message) {
        alert(`Error: ${err.message}`)
      } else {
        alert("Impossible to add this friend.")
      }
    }
  }

  // ------------------ MAIN OVERLAY ------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-[#2a2a27] rounded-lg p-6 w-[40rem] relative max-h-[85vh] flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-[#FFFACD] hover:text-red-500"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h3 className="font-press text-[#FFFACD] text-lg mb-4">
          {t("addFriend") || "Add Friend"}
        </h3>

        {/* Search input */}
        <input
          type="text"
          placeholder={t("enterUsername") || "Enter username"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 mb-4 bg-[#FFFACD] text-[#20201d] text-sm rounded font-press focus:outline-none"
        />

        {/* Search results */}
        <div className="flex-1 overflow-auto space-y-2 mb-4">
          {loading && <p className="text-[#FFFACD] text-sm">{t("loading")}</p>}

          {!loading && query && results.length === 0 && (
            <p className="text-[#FFFACD] text-sm">{t("noUsersFound")}</p>
          )}

          {results.length > 0 &&
            results.map((u) => (
              <div
                key={u.id}
                onClick={() => loadUserDetails(u)}
                className={`bg-[#20201d] p-3 rounded flex items-center gap-3 hover:bg-opacity-80 cursor-pointer ${
                  selected?.id === u.id ? "ring-2 ring-[#FFFACD]" : ""
                }`}
              >
                {/* Avatar */}
                <img
                  src={getAvatarUrl(u.avatar)}
                  alt={u.username}
                  className="w-10 h-10 rounded-full border-2 border-[#FFFACD] object-cover"
                />
                {/* Username + status */}
                <div>
                  <p className="font-press text-[#FFFACD]">{u.username}</p>
                  <p className="text-xs text-[#FFFACD] opacity-70">
                    {u.status?.toLowerCase() === "online"
                      ? t("online")
                      : `${t("offline")}`}
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* Friend summary (only if one is selected) */}
        {selected && (
          <div className="bg-[#20201d] rounded-lg p-4 flex-1 overflow-auto space-y-4 relative">
            {/* Close friend summary */}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 text-[#FFFACD] hover:text-red-500"
            >
              <X size={18} />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-4">
              <img
                src={getAvatarUrl(selected.avatar)}
                alt={selected.username}
                className="w-16 h-16 rounded-full border-2 border-[#FFFACD] object-cover"
              />
              <div>
                <h3 className="text-xl font-bold text-[#FFFACD]">{selected.username}</h3>
                <p className="text-sm text-[#FFFACD]">
                  {selected.status === "online"
                    ? t("online")
                    : `${t("offline")}`}
                </p>
                <p className="text-sm text-[#FFFACD]">
                  {t("gamesPlayed")}: {selected.gamesPlayed || 0}
                </p>
              </div>
            </div>

            {/* Match history */}
            <FriendMatchHistory recentMatches={selected.recentMatches?.slice(0, 5) || []} />

            {/* Statistics */}
            <FriendStatistics friendId={selected.id} />

            {/* Add friend button */}
            <button
              onClick={() => handleAddFriend(selected)}
              className="w-full py-2 bg-[#FFFACD] text-[#20201d] rounded font-press hover:bg-yellow-300"
            >
              {t("addFriend") || "Add Friend"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
