import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlayer } from "../../context/PlayerContext"
import TournamentBracket from "./TournamentBracket"
import { apiFetch } from "../../services/api"

// Tournament interface
interface Tournament {
  id: number
  name: string
  status: "registration" | "ongoing" | "finished"
}

// Result interface
interface Result {
  player: string
  score: number
  userId?: string
}

export default function TournamentList({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t: translate } = useTranslation()
  const { player } = usePlayer()

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loadingResults] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [participantsByTournament, setParticipantsByTournament] = useState<Record<number, any[]>>({})
  const [showBracket, setShowBracket] = useState(false)
  const [bracketTournamentId, setBracketTournamentId] = useState<number | null>(null)

  const fetchParticipants = async (tournamentId: number) => {
    try {
      const data = await apiFetch(`/api/tournaments/${tournamentId}/participants`)
      setParticipantsByTournament((prev: Record<number, any[]>) => ({ ...prev, [tournamentId]: data || [] }))
    } catch (error) {
      console.log(`No participants for tournament ${tournamentId}`)
      setParticipantsByTournament((prev: Record<number, any[]>) => ({ ...prev, [tournamentId]: [] }))
    }
  }

  const fetchTournaments = async () => {
    try {
      const tournamentsData = await apiFetch("/api/tournaments");
      setTournaments(tournamentsData);
      
      // Load participants for each tournament
      for (const tournament of tournamentsData) {
        await fetchParticipants(tournament.id);
      }
    } catch (error) {
      console.error("Error loading tournaments:", error);
      setTournaments([]);
    }
  }

  // Load tournaments on mount or when refreshKey changes
  useEffect(() => {
    fetchTournaments();
  }, [refreshKey]);

  // Bracket
  const handleViewBracket = (tournamentId: number) => {
    setBracketTournamentId(tournamentId);
    setShowBracket(true);
  };

  const closeBracket = () => {
    setShowBracket(false);
    setBracketTournamentId(null);
    fetchTournaments();
  };

  const closeModal = () => {
    setShowResultsModal(false)
    setSelectedTournament(null)
    setResults([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-[#FFFACD] font-press bg-[#2a2a27] min-h-screen">

      {tournaments.length === 0 ? (
        <p className="text-center">{translate("noTournaments") || "No tournaments available."}</p>
      ) : (
        tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="bg-[#20201d] rounded-lg p-4 flex flex-col gap-2 shadow-md"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">{tournament.name}</div>
                <div className="text-sm opacity-70">
                  {tournament.status === "registration"
                    ? translate("registration") || "Registration"
                    : tournament.status === "ongoing"
                    ? translate("ongoing") || "Ongoing"
                    : translate("finished") || "Finished"}
                </div>
              </div>

              <div className="flex gap-4">
                {/* Buttons for all statuses */}
                {tournament.status === "finished" ? (
                  // For finished tournaments: View Results in white
                  <button
                    onClick={() => handleViewBracket(tournament.id)}
                    className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded hover:bg-opacity-90 transition-colors font-semibold"
                  >
                    {translate("viewResults") || "View Results"}
                  </button>
                ) : (
                  // For ongoing or registration tournaments: View Bracket in blue
                  <button
                    onClick={() => handleViewBracket(tournament.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors font-semibold"
                  >
                    {translate("viewBracket") || "View Bracket"}
                  </button>
                )}
              </div>
            </div>

            {/* Participants section */}
            {participantsByTournament[tournament.id] && participantsByTournament[tournament.id].length > 0 && (
              <div className="mt-4 p-3 bg-[#1a1a17] rounded-lg">
                <h4 className="text-sm font-semibold mb-2 text-[#FFFACD] opacity-80">
                  {translate("participants") || "Participants"} ({participantsByTournament[tournament.id].length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {participantsByTournament[tournament.id].map((participant: any, index: number) => (
                    <span 
                      key={participant.id || index}
                      className="px-2 py-1 bg-[#2a2a27] rounded text-xs text-[#FFFACD]"
                    >
                      {participant.username}
                      {participant.id === player?.id && " (You)"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Results modal */}
      {showResultsModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-[#20201d] p-6 rounded-lg max-w-lg w-full text-[#FFFACD] relative shadow-lg">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-red-400 hover:text-red-300 font-bold text-xl"
              aria-label="Close"
            >
              &times;
            </button>

            <h2 className="text-2xl mb-4 text-center">{selectedTournament.name}</h2>

            {loadingResults ? (
              <p>{translate("loading") || "Loading..."}</p>
            ) : results.length === 0 ? (
              <p>{translate("noResults") || "No results available."}</p>
            ) : (
              <div className="space-y-4">
                {/* Podium Top 3 */}
                <div className="flex justify-center items-end gap-6 mb-4">
                  {results.slice(0, 3).map((r, i) => {
                    const podiumColors = ["#FFD700", "#C0C0C0", "#CD7F32"]
                    const heights = ["120px", "90px", "70px"]
                    const index = i === 1 ? 0 : i === 0 ? 1 : 2

                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center"
                        style={{ order: index }}
                      >
                        <div
                          className="w-20 rounded-t-md flex items-center justify-center text-black font-bold"
                          style={{
                            backgroundColor: podiumColors[i],
                            height: heights[i],
                          }}
                        >
                          {r.score}
                        </div>
                        <span className="mt-1 text-sm">{r.player}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Other players */}
                {results.length > 3 && (
                  <ul className="list-decimal pl-6 space-y-1">
                    {results.slice(3).map((r, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{r.player}</span>
                        <span className="font-semibold">{r.score}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Tournament Bracket Modal */}
      {showBracket && bracketTournamentId && (
        <TournamentBracket
          tournamentId={bracketTournamentId}
          onClose={closeBracket}
        />
      )}
    </div>
  )
}