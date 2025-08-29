import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"
import { apiFetch } from "../../services/api";

interface Match {
  id: number;
  tournamentId: number;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Score?: number;
  player2Score?: number;
  winnerId?: string;
  round: number;
  phase: string;
  status: 'pending' | 'finished';
  playedAt?: string;
}

interface Tournament {
  id: number;
  name: string;
  status: 'registration' | 'ongoing' | 'finished';
  winnerId?: string;
}

interface Standing {
  userId: string;
  username: string;
  wins: number;
  losses: number;
  points: number;
  totalScore: number;
  rank: number;
}

interface TournamentBracketProps {
  tournamentId: number;
  onClose: () => void;
}

export default function TournamentBracket({ tournamentId, onClose }: TournamentBracketProps) {
  const { t } = useTranslation()
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<any[]>([]); // Add participants state
  const [standings, setStandings] = useState<Standing[]>([]);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [allMatches, setAllMatches] = useState<Match[]>([]);

  const fetchBracketData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/tournaments/${tournamentId}/bracket`);
      
      setTournament(data.tournament);
      setParticipants(data.participants || []); // Set participants from server
      setStandings(data.standings || []);
      setCurrentMatches(data.currentMatches || []);
      setCurrentRound(data.currentRound || 1);
      setTotalRounds(data.totalRounds || 1);
      
      // If tournament is finished, fetch all matches
      if (data.tournament?.status === 'finished') {
        const tournamentData = await apiFetch(`/api/tournaments/${tournamentId}`);
        setAllMatches(tournamentData.matches || []);
      }
      
    } catch (error) {
      console.error('Error fetching bracket data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBracketData();
  }, [tournamentId]);

  const launchMatch = (match: Match) => {
    const matchData = {
      player1: match.player1Name,
      player2: match.player2Name,
      matchId: match.id,
      tournamentId: match.tournamentId,
      round: match.round,
      phase: match.phase
    };

    // Navigate to game with tournament match data
    navigate('/game', { state: { tournamentMatch: matchData } });
  };
  
  const submitResult = async (matchId: number) => {
	// Find the match to get player names
	const match = currentMatches.find(m => m.id === matchId);
	if (!match) {
		alert("Match not found");
		return;
	}

	let player1Score: number | null = null;
	let player2Score: number | null = null;

	// Loop for Player 1 with their actual name
	while (true) {
		const input = prompt(`Enter ${match.player1Name} score (0–11):`);
		if (input === null) return; // Cancel

		const value = parseInt(input, 10);
		if (!isNaN(value) && value >= 0 && value <= 11) {
		player1Score = value;
		break;
		}
		alert(`❌ Invalid score for ${match.player1Name}. Please enter a number between 0 and 11.`);
	}

	// Loop for Player 2 with their actual name
	while (true) {
		const input = prompt(`Enter ${match.player2Name} score (0–11):`);
		if (input === null) return; // Cancel

		const value = parseInt(input, 10);
		if (!isNaN(value) && value >= 0 && value <= 11) {
		player2Score = value;
		break;
		}
		alert(`❌ Invalid score for ${match.player2Name}. Please enter a number between 0 and 11.`);
	}

	const token = localStorage.getItem("token");
	if (!token) {
		alert("No authentication token found.");
		return;
	}

	try {
		await apiFetch(
		`/api/tournaments/${tournamentId}/matches/${matchId}/result`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				player1Score,
				player2Score,
			}),
		}
		);

		fetchBracketData(); // Refresh data
	} catch (error) {
		console.error("Error submitting result:", error);
		alert("Error submitting result");
	}
  };

  // Group matches by round for finished tournaments
  const getMatchesByRoundAndPhase = () => {
    if (tournament?.status !== 'finished') return {};
    
    const matchesByRound: { [round: number]: { [phase: string]: Match[] } } = {};
    allMatches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = {};
      }
      if (!matchesByRound[match.round][match.phase]) {
        matchesByRound[match.round][match.phase] = [];
      }
      matchesByRound[match.round][match.phase].push(match);
    });
    return matchesByRound;
  };

  // Get phase display name
  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'round_1': return '🥊 Round 1';
      case 'semifinal': return '🥇 Semifinal';
      case 'final': return '🏆 Final';
      case 'winners_bracket': return '🏆 Winners Bracket';
      case 'losers_bracket': return '💔 Losers Bracket';
      case 'crossover_match': return '⚔️ Crossover Match';
      case 'final_bracket': return '🏁 Finals';
      // Support for points-based phases
      default: {
        if (phase.startsWith('points_')) {
          const points = phase.split('_')[1];
          return `⚖️ ${points} Points Bracket`;
        }
        return phase;
      }
    }
  };

  const renderMatch = (match: Match) => {
    const getPhaseColor = (phase: string) => {
      switch (phase) {
        case 'round_1': return 'border-blue-500';
        case 'semifinal': return 'border-purple-500';
        case 'final': return 'border-yellow-500';
        case 'winners_bracket': return 'border-green-500';
        case 'losers_bracket': return 'border-red-500';
        case 'crossover_match': return 'border-purple-500';
        case 'final_bracket': return 'border-yellow-500';
        default: {
          // Color for points-based phases
          if (phase.startsWith('points_')) {
            return 'border-orange-500';
          }
          return 'border-gray-500';
        }
      }
    };

    return (
      <div key={match.id} className={`rounded-lg p-4 border-2 flex justify-between items-center ${
        match.status === 'finished' 
          ? `bg-green-900/30 ${getPhaseColor(match.phase)}` 
          : `bg-[#1a1a17] ${getPhaseColor(match.phase)}`
      }`}>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded font-semibold ${
                match.status === 'finished' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-orange-600 text-white'
              }`}>
                {match.status === 'finished' ? '✅ Finished' : '⏳ Pending'}
              </span>
              
              {/* Phase badge */}
              <span className={`text-xs px-2 py-1 rounded font-semibold ${
                match.phase === 'winners_bracket' ? 'bg-green-700 text-white' :
                match.phase === 'losers_bracket' ? 'bg-red-700 text-white' :
                match.phase === 'crossover_match' ? 'bg-purple-700 text-white' :
                match.phase.startsWith('points_') ? 'bg-orange-700 text-white' :
                'bg-blue-700 text-white'
              }`}>
                {getPhaseDisplayName(match.phase)}
              </span>
            </div>
            
            {match.status === 'finished' && match.winnerId && (
              <span className="text-green-400 text-sm font-semibold">
                🏆 Winner: {match.winnerId === match.player1Id ? match.player1Name : match.player2Name}
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <div className={`font-semibold ${
              match.status === 'finished' && match.winnerId === match.player1Id 
                ? 'text-green-400' 
                : match.status === 'finished' 
                ? 'text-red-300' 
                : ''
            }`}>
              {match.player1Name}
              {match.status === 'finished' && (
                <span className="ml-2 text-lg font-bold">
                  ({match.player1Score})
                </span>
              )}
            </div>
            <div className="mx-4 text-gray-400 font-bold">VS</div>
            <div className={`font-semibold text-right ${
              match.status === 'finished' && match.winnerId === match.player2Id 
                ? 'text-green-400' 
                : match.status === 'finished' 
                ? 'text-red-300' 
                : ''
            }`}>
              {match.player2Name}
              {match.status === 'finished' && (
                <span className="ml-2 text-lg font-bold">
                  ({match.player2Score})
                </span>
              )}
            </div>
          </div>
          
          {match.status === 'finished' && match.playedAt && (
            <div className="text-xs text-gray-400 text-center">
              Played: {new Date(match.playedAt).toLocaleString()}
            </div>
          )}
        </div>
        
        {match.status === 'pending' && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => launchMatch(match)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold"
            >
              🎮 Play
            </button>
            <button
              onClick={() => submitResult(match.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
            >
              📝 Submit Score
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderStandings = () => (
    <div className="bg-[#1a1a17] rounded-lg p-6">
      <h3 className="text-2xl font-bold mb-4 text-center text-yellow-400">
        {tournament?.status === 'finished' ? '🏆 Final Standings' : '📊 Current Standings'}
      </h3>
      
      {tournament?.status === 'finished' && standings.length > 0 && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 bg-yellow-600 text-black px-6 py-3 rounded-lg font-bold text-xl">
            <span className="text-2xl">👑</span>
            <span>Champion: {standings[0]?.username}</span>
            <span className="text-2xl">🏆</span>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {standings.map((standing) => (
          <div 
            key={standing.userId} 
            className={`flex justify-between items-center p-4 rounded-lg ${
              standing.rank === 1 
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold border-2 border-yellow-300' 
                : standing.rank === 2
                ? 'bg-gradient-to-r from-gray-400 to-gray-300 text-black font-bold border-2 border-gray-200'
                : standing.rank === 3
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold border-2 border-amber-300'
                : 'bg-[#2a2a27] border border-gray-600'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">
                {standing.rank === 1 ? '🥇' : standing.rank === 2 ? '🥈' : standing.rank === 3 ? '🥉' : `#${standing.rank}`}
              </span>
              <span className="text-lg font-semibold">{standing.username}</span>
              {standing.rank === 1 && tournament?.status === 'finished' && (
                <span className="text-2xl animate-bounce">👑</span>
              )}
            </div>
            <div className="flex gap-6 text-sm font-semibold">
              <span className="text-green-400">Wins: {standing.wins}</span>
              <span className="text-red-400">Losses: {standing.losses}</span>
              <span className="text-blue-400">Points: {standing.points}</span>
            </div>
          </div>
        ))}
      </div>
      
      {tournament?.status === 'finished' && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>🎊 Thank you all for participating! 🎊</p>
        </div>
      )}
    </div>
  );

    const renderParticipants = () => (
    <div className="bg-[#1a1a17] rounded-lg p-6">
      <h3 className="text-2xl font-bold mb-4 text-center text-blue-400">
        👥 Tournament Participants ({participants.length})
      </h3>
      
      {participants.length === 0 ? (
        <div className="text-center text-gray-400">
          <p>No participants found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {participants.map((participant, index) => (
            <div 
              key={participant.id || index}
              className="bg-[#2a2a27] rounded-lg p-3 text-center border border-gray-600 hover:border-blue-500 transition-colors"
            >
              <div className="text-lg font-semibold text-[#FFFACD]">
                {participant.username}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );


  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
        <div className="text-[#FFFACD] text-xl">Loading bracket...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-[#20201d] rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto text-[#FFFACD] relative">
        <div className="sticky top-0 bg-[#20201d] p-6 border-b border-[#3a3a37] flex justify-between items-center">
          <h2 className="text-3xl font-bold">{tournament?.name}</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-300 font-bold text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Tournament Status */}
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">
              {tournament?.status === 'ongoing' && `Round ${currentRound} of ${totalRounds}`}
              {tournament?.status === 'finished' && '🏆 Tournament Finished'}
            </h3>
            {tournament?.status === 'ongoing' && (
              <p className="text-gray-400">
                {t("completeAllMatches")}
              </p>
            )}
            {tournament?.status === 'finished' && (
              <p className="text-green-400 text-lg">
                🎉 {t("congratulation")} {t("allParticipants")}
              </p>
            )}
          </div>

          {/* Participants Section */}
          {renderParticipants()}

          {/* Final Standings - Show first for finished tournaments */}
          {tournament?.status === 'finished' && standings.length > 0 && (
            <div>
              {renderStandings()}
            </div>
          )}

          {/* All Matches by Round - For finished tournaments */}
          {tournament?.status === 'finished' && allMatches.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold mb-6 text-center text-blue-400">
                📊 {t("allTournamentMatches")}
              </h3>
              {Object.entries(getMatchesByRoundAndPhase())
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([round, phaseMatches]) => (
                  <div key={round} className="mb-8">
                    <h4 className="text-xl font-semibold mb-4 text-orange-400">
                      Round {round}
                    </h4>
                    
                    {/* Group by phase within each round */}
                    {Object.entries(phaseMatches).map(([phase, matches]) => (
                      <div key={phase} className="mb-6">
                        <h5 className="text-lg font-medium mb-3 text-yellow-300">
                          {getPhaseDisplayName(phase)}
                        </h5>
                        <div className="space-y-4 ml-4">
                          {matches.map(match => renderMatch(match))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}

          {/* Current Matches by Phase - For ongoing tournaments */}
          {tournament?.status === 'ongoing' && currentMatches.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold mb-6 text-center text-orange-400">
                {`Round ${currentRound} Matches`}
              </h3>
              
              {/* Group current matches by phase */}
              {Object.entries(
                currentMatches.reduce((acc, match) => {
                  if (!acc[match.phase]) acc[match.phase] = [];
                  acc[match.phase].push(match);
                  return acc;
                }, {} as { [phase: string]: Match[] })
              ).map(([phase, matches]) => (
                <div key={phase} className="mb-6">
                  <h4 className="text-lg font-medium mb-3 text-yellow-300">
                    {getPhaseDisplayName(phase)}
                  </h4>
                  <div className="space-y-4 ml-4">
                    {matches.map(match => renderMatch(match))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Standings - For ongoing tournaments */}
          {tournament?.status === 'ongoing' && standings.length > 0 && (
            <div>
              {renderStandings()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}