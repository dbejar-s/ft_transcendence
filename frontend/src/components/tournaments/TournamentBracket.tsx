import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';

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
  status: 'pending' | 'finished';
  playedAt?: string;
}

interface Tournament {
  id: number;
  name: string;
  status: 'registration' | 'ongoing' | 'finished';
  winnerId?: string;
}

interface TournamentBracketProps {
  tournamentId: number;
  onClose: () => void;
}

export default function TournamentBracket({ tournamentId, onClose }: TournamentBracketProps) {
  const { t: translate } = useTranslation();
  const { player } = usePlayer();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [bracket, setBracket] = useState<{ [key: number]: Match[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);

  useEffect(() => {
    fetchTournamentData();
    if (player && tournament?.status === 'ongoing') {
      fetchMyMatches();
    }
  }, [tournamentId, player, tournament?.status]);

  const fetchTournamentData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/bracket`);
      if (response.ok) {
        const data = await response.json();
        setTournament(data.tournament);
        setParticipants(data.participants);
        setBracket(data.bracket);
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyMatches = async () => {
    if (!player) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/my-matches`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyMatches(data);
      }
    } catch (error) {
      console.error('Error fetching my matches:', error);
    }
  };

  const initiateTournament = async () => {
    if (!player) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Tournament initiated successfully!');
        fetchTournamentData();
      } else {
        const error = await response.text();
        alert(`Error initiating tournament: ${error}`);
      }
    } catch (error) {
      console.error('Error initiating tournament:', error);
      alert('Error initiating tournament');
    }
  };

  const submitMatchResult = async () => {
    if (!selectedMatch || !player) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/matches/${selectedMatch.id}/result`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player1Score,
          player2Score
        })
      });

      if (response.ok) {
        alert('Match result submitted successfully!');
        setSelectedMatch(null);
        setPlayer1Score(0);
        setPlayer2Score(0);
        fetchTournamentData();
        fetchMyMatches();
      } else {
        const error = await response.text();
        alert(`Error submitting result: ${error}`);
      }
    } catch (error) {
      console.error('Error submitting match result:', error);
      alert('Error submitting match result');
    }
  };

  const launchMatch = (match: Match) => {
    // Store match information for the Game component
    const matchData = {
      player1: match.player1Name,
      player2: match.player2Name,
      matchId: match.id,
      tournamentId: match.tournamentId,
      round: match.round
    };
    
    // Store in localStorage so Game component can access it
    localStorage.setItem('currentMatch', JSON.stringify(matchData));
    
    // Navigate to game page
    window.location.href = '/game';
  };

  const isCreator = () => {
    return participants.length > 0 && participants[0]?.id === player?.id;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
        <div className="bg-[#20201d] p-6 rounded-lg text-[#FFFACD]">
          <p>{translate('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-[#20201d] rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto text-[#FFFACD] relative shadow-lg">
        <div className="sticky top-0 bg-[#20201d] p-6 border-b border-[#FFFACD] border-opacity-20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-red-400 hover:text-red-300 font-bold text-xl"
            aria-label="Close"
          >
            &times;
          </button>
          
          <h2 className="text-2xl font-bold mb-2">{tournament?.name}</h2>
          <div className="flex justify-between items-center">
            <span className="text-sm opacity-70">
              {translate('status')}: {tournament?.status}
            </span>
            
            {tournament?.status === 'registration' && isCreator() && (
              <button
                onClick={initiateTournament}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-semibold"
              >
                {translate('initiateTournament') || 'Initiate Tournament'}
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* My Matches Section */}
          {myMatches.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">{translate('myMatches') || 'My Matches'}</h3>
              <div className="grid gap-4">
                {myMatches.map((match) => (
                  <div key={match.id} className="bg-[#2a2a27] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">Round {match.round}</span>
                        <div className="text-sm">
                          {match.player1Name} vs {match.player2Name}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => launchMatch(match)}
                          className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 text-sm font-semibold"
                        >
                          🎮 Launch Match
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setPlayer1Score(0);
                            setPlayer2Score(0);
                          }}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                          {translate('submitResult') || 'Submit Result'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Bracket */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">{translate('bracket') || 'Bracket'}</h3>
            {Object.keys(bracket).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(bracket).map(([round, roundMatches]) => (
                  <div key={round}>
                    <h4 className="text-lg font-semibold mb-3">
                      {translate('round')} {round}
                    </h4>
                    <div className="grid gap-2">
                      {roundMatches.map((match) => (
                        <div key={match.id} className="bg-[#2a2a27] p-3 rounded flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <span className={`${match.winnerId === match.player1Id ? 'font-bold text-green-400' : ''}`}>
                                  {match.player1Name}
                                </span>
                                {match.player1Score !== undefined && (
                                  <span className="ml-2">({match.player1Score})</span>
                                )}
                              </div>
                              <span className="text-sm opacity-70 mx-4">vs</span>
                              <div>
                                <span className={`${match.winnerId === match.player2Id ? 'font-bold text-green-400' : ''}`}>
                                  {match.player2Name}
                                </span>
                                {match.player2Score !== undefined && (
                                  <span className="ml-2">({match.player2Score})</span>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-sm">
                                {match.status === 'finished' ? (
                                  <span className="text-green-400">✓ Finished</span>
                                ) : (
                                  <span className="text-yellow-400">⏳ Pending</span>
                                )}
                              </div>
                              {match.status === 'pending' && (
                                <button
                                  onClick={() => launchMatch(match)}
                                  className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors text-sm font-semibold"
                                >
                                  🎮 Launch Match
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm opacity-70">
                {translate('noBracketYet') || 'Tournament bracket will appear here once initiated.'}
              </p>
            )}
          </div>

          {/* Participants */}
          <div>
            <h3 className="text-xl font-bold mb-4">{translate('participants') || 'Participants'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className={`p-2 rounded text-center text-sm ${
                    participant.status === 'winner' ? 'bg-yellow-600' :
                    participant.status === 'advanced' ? 'bg-green-600' :
                    participant.status === 'eliminated' ? 'bg-red-600' :
                    'bg-[#2a2a27]'
                  }`}
                >
                  {participant.username}
                  {participant.status === 'winner' && ' 👑'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Match Result Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-60">
            <div className="bg-[#20201d] p-6 rounded-lg max-w-md w-full text-[#FFFACD] relative shadow-lg">
              <button
                onClick={() => setSelectedMatch(null)}
                className="absolute top-3 right-3 text-red-400 hover:text-red-300 font-bold text-xl"
              >
                &times;
              </button>
              
              <h3 className="text-xl font-bold mb-4">
                {translate('submitMatchResult') || 'Submit Match Result'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">
                    {selectedMatch.player1Name} {translate('score')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={player1Score}
                    onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
                    className="w-full p-2 rounded text-[#20201d]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-1">
                    {selectedMatch.player2Name} {translate('score')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={player2Score}
                    onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
                    className="w-full p-2 rounded text-[#20201d]"
                  />
                </div>
                
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    {translate('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={submitMatchResult}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {translate('submit') || 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
