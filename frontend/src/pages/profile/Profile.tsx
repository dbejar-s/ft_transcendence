import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import UserInfo from "../../components/profile/UserInfo";
import Friends from "../../components/profile/Friends";
import MatchHistory from "../../components/profile/MatchHistory";
import Statistics from "../../components/profile/Statistics";
import { usePlayer } from "../../context/PlayerContext";
import type { Match } from "../../types/Match"
import i18n from "../../i18n";

interface Player {
  id: string;
  username: string;
  email: string;
  avatar: string;
  language?: string;
  recentMatches?: Match[];
}

export default function Profile() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"user" | "friends" | "matches" | "stats">("user");
  const { player, setPlayer } = usePlayer() as { player: Player, setPlayer: (p: Player) => void };

  if (!player) {
    return <div>{t("loading") || "Loading..."}</div>;
  }

  // Fetch user data only on mount (not constantly)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`https://localhost:3001/api/users/current?ts=${Date.now()}`, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (res.ok) {
          const user = await res.json();
          setPlayer(user);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []); // Empty dependency array - only runs on mount

  // Remove the second useEffect that was constantly refreshing when switching to user tab

  useEffect(() => {
	if (player?.language) {
		i18n.changeLanguage(player.language)
	}
  }, [player?.language])

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
				language: player.language || 'en'
			}}
			onProfileUpdated={async () => {
				// Refresh user data only when profile is actually updated
				try {
					const res = await fetch(`https://localhost:3001/api/users/current?ts=${Date.now()}`, {
						headers: { 
							Authorization: `Bearer ${localStorage.getItem("token")}`,
							'Cache-Control': 'no-cache',
							'Pragma': 'no-cache'
						}
					});
					
					if (res.ok) {
						const user = await res.json();
						console.log('Profile updated, refreshing user data:', user);
						setPlayer(user);
					}
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