import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import UserInfo from "../../components/profile/UserInfo";
import Friends from "../../components/profile/Friends";
import MatchHistory from "../../components/profile/MatchHistory";
import Statistics from "../../components/profile/Statistics";
import { usePlayer } from "../../context/PlayerContext";
import type { Match } from "../../types/Match"
import i18n from "../../i18n";
import { apiFetch } from "../../services/api";

interface Player {
  id: string;
  username: string;
  email: string;
  avatar: string;
  language?: string;
  provider?: string;
  recentMatches?: Match[];
}

export default function Profile() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"user" | "friends" | "matches" | "stats">("user");
  const { player, setPlayer } = usePlayer() as { player: Player, setPlayer: (p: Player) => void };
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false); // Prevent duplicate requests

  // Always fetch fresh user data when Profile component mounts
  useEffect(() => {
    // Prevent duplicate requests
    if (hasFetched) return;
    
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasFetched(true); // Mark as fetched before making request
        
        // Simple fetch with apiFetch (backend already handles cache control)
        const user = await apiFetch(`/api/users/current?ts=${Date.now()}`);
        setPlayer(user); // This will update both context and localStorage
      } catch (error) {
        console.error('Error fetching current user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, [hasFetched]); // Only run when hasFetched changes

  // Set language when player data changes
  useEffect(() => {
	if (player?.language) {
		i18n.changeLanguage(player.language)
	}
  }, [player?.language])

  if (isLoading) {
    return <div>{t("loading") || "Loading..."}</div>;
  }

  if (!player) {
    return <div>{t("loading") || "Loading..."}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#2a2a27] text-[#FFFACD] p-4">
      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-[#FFFACD] border-opacity-30">
        <button
          className={`py-2 px-4 font-press text-sm transition-all duration-200 ${
            activeTab === "user" ? "border-b-4 border-[#FFFACD] text-[#FFFACD]" : "opacity-60 hover:opacity-80"
          }`}
          onClick={() => setActiveTab("user")}
        >
          {player.username}
        </button>
        <button
          className={`py-2 px-4 font-press text-sm transition-all duration-200 ${
            activeTab === "friends" ? "border-b-4 border-[#FFFACD] text-[#FFFACD]" : "opacity-60 hover:opacity-80"
          }`}
          onClick={() => setActiveTab("friends")}
        >
          {t("friends") || "Friends"}
        </button>
        <button
          className={`py-2 px-4 font-press text-sm transition-all duration-200 ${
            activeTab === "matches" ? "border-b-4 border-[#FFFACD] text-[#FFFACD]" : "opacity-60 hover:opacity-80"
          }`}
          onClick={() => setActiveTab("matches")}
        >
          {t("matchHistory") || "Match History"}
        </button>
        <button
          className={`py-2 px-4 font-press text-sm transition-all duration-200 ${
            activeTab === "stats" ? "border-b-4 border-[#FFFACD] text-[#FFFACD]" : "opacity-60 hover:opacity-80"
          }`}
          onClick={() => setActiveTab("stats")}
        >
          {t("statistics") || "Statistics"}
        </button>
      </div>

      {/* Content */}
      <div className="bg-[#20201d] rounded-xl p-6 shadow-lg border border-[#FFFACD] border-opacity-20">
        {activeTab === "user" && (
          <UserInfo
			initialUser={{
				id: player.id,
				username: player.username,
				email: player.email,
				avatar: player.avatar,
				language: player.language || 'en',
				provider: player.provider
			}}
			onProfileUpdated={async () => {
				// Refresh user data only when profile is actually updated
				try {
					const token = localStorage.getItem("token");
					if (!token) return;
					
					const user = await apiFetch(`/api/users/current?ts=${Date.now()}`);
					setPlayer(user);
				} catch (error) {
					console.error('Error refreshing user data after profile update:', error);
				}
			}}
		  />
        )}

        {activeTab === "friends" && (
          <Friends
            userId={player.id}
            recentMatches={player.recentMatches || []}
          />
        )}

        {activeTab === "matches" && (
          <MatchHistory />
        )}
        
        {activeTab === "stats" && (
          <Statistics userId={player.id} />
        )}

            </div>
          </div>
        );
}