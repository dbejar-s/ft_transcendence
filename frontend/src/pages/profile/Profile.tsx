import { useState } from "react";
import { useTranslation } from "react-i18next";
import UserInfo from "../../components/profile/UserInfo";
import Friends from "../../components/profile/Friends";
import MatchHistory from "../../components/profile/MatchHistory";
import Statistics from "../../components/profile/Statistics";
import { usePlayer } from "../../context/PlayerContext";

export default function Profile() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"user" | "friends" | "matches" | "stats">("user");
  const { player } = usePlayer();

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
        {/* FIXED: Removed props from UserInfo */}
        {activeTab === "user" && <UserInfo />}
        {activeTab === "friends" && <Friends />}
        {activeTab === "matches" && <MatchHistory />}
        {activeTab === "stats" && <Statistics />}
      </div>
    </div>
  );
}