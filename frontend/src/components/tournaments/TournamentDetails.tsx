import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Match {
  id: number;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  winner: string | null;
}

interface TournamentDetailsProps {
  tournamentId: number;
}

export default function TournamentDetails({ tournamentId }: TournamentDetailsProps) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/matches`)
      .then(res => res.json())
      .then(setMatches);
  }, [tournamentId]);

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-[#FFFACD] font-press">{t("matches")}</h3>
      {matches.map((m) => (
        <div key={m.id} className="bg-[#20201d] p-4 rounded text-[#FFFACD]">
          <div>{m.player1} vs {m.player2}</div>
          <div>{m.score1} - {m.score2}</div>
          {m.winner && (
            <div className="text-green-400">{t("winner")}: {m.winner}</div>
          )}
        </div>
      ))}
    </div>
  );
}
