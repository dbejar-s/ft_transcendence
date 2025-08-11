import { useTranslation } from "react-i18next";

interface Props {
  tournamentId: number;
  userId: number;
}

export default function JoinTournament({ tournamentId, userId }: Props) {
  const { t } = useTranslation();
  const handleJoin = () => {
    fetch(`/api/tournaments/${tournamentId}/join`, {
      method: "POST",
      body: JSON.stringify({ userId }),
      headers: { "Content-Type": "application/json" },
    });
  };

  return (
    <button
      className="bg-[#FFFACD] text-[#2a2a27] px-4 py-2 rounded font-bold hover:opacity-80"
      onClick={handleJoin}
    >
      {t("joinTournament")}
    </button>
  );
}
