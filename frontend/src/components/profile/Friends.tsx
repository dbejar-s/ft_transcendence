import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Search, UserPlus, UserMinus, Clock } from "lucide-react"
import type { Friend } from "./FriendProfile"
import FriendProfile from "./FriendProfile"
import AddFriendOverlay from "./AddFriend"
import { getAvatarUrl } from "../../utils/avatarUtils"
import { apiFetch } from "../../services/api"

interface Match {
  id: string;
  opponent: string;
  opponentAvatar: string;
  result: "win" | "loss";
  score: string;
  gameMode: string;
  duration: string;
  date: string;
}

interface Props {
  userId: string;
  recentMatches: Match[];
}

export default function Friends({ userId }: Props) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all")
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const { t } = useTranslation()

  // Listen to global friend status updates
  useEffect(() => {
    console.log("Setting up global friend status listener in Friends component");
    
    const handleFriendStatusUpdate = (event: CustomEvent) => {
      const { userId: friendUserId, status } = event.detail;
      console.log("Friends component received status update:", friendUserId, status);
      
      setFriends((prev: Friend[]) => {
        const updated = prev.map((f: Friend) => 
          f.id === friendUserId ? { ...f, status } : f
        );
        console.log("Friends component updated friends list after status change");
        return updated;
      });
    };

    window.addEventListener('friendStatusUpdate', handleFriendStatusUpdate as EventListener);

    return () => {
      console.log("Cleaning up global friend status listener in Friends component");
      window.removeEventListener('friendStatusUpdate', handleFriendStatusUpdate as EventListener);
    };
  }, []);

  // Load friends list from backend
  useEffect(() => {
    apiFetch(`/api/users/${userId}/friends`)
      .then((data: Friend[]) => setFriends(data))
      .catch(console.error);
  }, [userId]);

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === "all" || friend.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => (status === "online" ? "bg-green-500" : "bg-gray-500")
  
  // delete friend
  const removeFriend = async (friendId: string) => {
    try {
      await apiFetch(`/api/users/${userId}/friends/${friendId}`, {
        method: "DELETE",
      });

      const data: Friend[] = await apiFetch(`/api/users/${userId}/friends`);
      setFriends(data);
      if (selectedFriend?.id === friendId) setSelectedFriend(null);
    } catch (e) {
      console.error(e);
      alert(t("errorRemovingFriend") || "Error removing friend");
    }
  };

  // load friend profile
  const loadFriendProfile = async (friendId: string) => {
    try {
      const data: Friend = await apiFetch(`/api/users/${userId}/friends/${friendId}/details`);
      setSelectedFriend(data);
    } catch (e) {
      console.error(e);
      alert("Error loading friend profile");
    }
  }

  // add new friend and update state
  const handleFriendAdded = (newFriend: Friend) => {
    setFriends((prev) => [...prev, newFriend])
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <h2 className="text-lg font-press font-bold text-[#FFFACD]">
            {t("friends") || "Friends"} ({friends.length})
          </h2>
        </div>
        <button
          onClick={() => setShowOverlay(true)}
          className="bg-[#FFFACD] text-[#20201d] text-xs px-4 py-2 rounded font-press hover:bg-opacity-90 transition-colors flex items-center gap-2"
        >
          <UserPlus size={16} />
          {t("addFriend") || "Add Friend"}
        </button>
      </div>

      {/* SEARCH + FILTER */}
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

      {/* FRIEND LIST */}
      {selectedFriend ? (
        <FriendProfile friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-auto">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-[#FFFACD] opacity-60">
              <div className="text-2xl mb-4">👥</div>
              <p className="font-press">{searchTerm ? t("noFriendsFound") : t("noFriendsDisplay")}</p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="bg-[#2a2a27] rounded-lg p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors cursor-pointer"
              >
                <div
                  className="flex items-center gap-4"
                  onClick={() => loadFriendProfile(friend.id)}
                >
                  <div className="relative">
                    <img
                      src={getAvatarUrl(friend.avatar)}
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
                          <span>{t("offline")}</span>
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

      {/* OVERLAY Add Friend */}
      {showOverlay && (
        <AddFriendOverlay
          userId={userId}
          onClose={() => setShowOverlay(false)}
          onFriendAdded={handleFriendAdded}
        />
      )}
    </div>
  )
}
