import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

// Tournament interface
interface Tournament {
  id: number
  name: string
  status: "not_started" | "ongoing" | "finished"
}

// Result interface
interface Result {
  player: string
  score: number
}

export default function TournamentList() {
  const { t: translate } = useTranslation()

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [registeredTournamentIds, setRegisteredTournamentIds] = useState<number[]>([])
  const [participantsByTournament, setParticipantsByTournament] = useState<Record<number, string[]>>({})

  useEffect(() => {
    // Mocked tournaments - replace with real API call
    const mockTournaments: Tournament[] = [
      { id: 1, name: "Spring Showdown", status: "not_started" },
      { id: 2, name: "Summer Slam", status: "ongoing" },
      { id: 3, name: "Fall Finale", status: "finished" },
    ]
    setTournaments(mockTournaments)
  }, [])

  const handleViewResults = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setShowResultsModal(true)
    setLoadingResults(true)

    const mockResults: Record<number, Result[]> = {
      2: [
        { player: "Alice", score: 15 },
        { player: "Bob", score: 12 },
        { player: "Kathy", score: 9 },
        { player: "Liam", score: 7 },
        { player: "Ian", score: 13 },
        { player: "Jack", score: 11 },
        { player: "Mia", score: 5 },
        { player: "Nina", score: 3 },
        { player: "Oscar", score: 1 },
        { player: "Eve", score: 10 },
        { player: "Frank", score: 8 },
      ],
      3: [
        { player: "Charlie", score: 20 },
        { player: "Diana", score: 18 },
        { player: "George", score: 16 },
        { player: "Hannah", score: 14 },
        { player: "Ian", score: 13 },
        { player: "Jack", score: 11 },
        { player: "Kathy", score: 9 },
        { player: "Liam", score: 7 },
        { player: "Mia", score: 5 },
        { player: "Nina", score: 3 },
        { player: "Oscar", score: 1 },
      ],
    }

    setTimeout(() => {
      const res = mockResults[tournament.id] || []
      const sorted = res.sort((a, b) => b.score - a.score)
      setResults(sorted)
      setLoadingResults(false)
    }, 500)
  }

  const handleRegister = (tournamentId: number) => {
    alert(`You registered for tournament #${tournamentId}`)

    // TODO: Replace with API call and real participant list update
    // For demo, we add the tournamentId and update participants list mock
    setRegisteredTournamentIds((prev) => [...prev, tournamentId])

    setParticipantsByTournament((prev) => {
      const updated = { ...prev }
      // If no participants yet, initialize with some mock names + current user "You"
      if (!updated[tournamentId]) {
        updated[tournamentId] = ["You", `PlayerA_${tournamentId}`, `PlayerB_${tournamentId}`]
      } else if (!updated[tournamentId].includes("You")) {
        updated[tournamentId] = [...updated[tournamentId], "You"]
      }
      return updated
    })
  }

  const handleUnregister = (tournamentId: number) => {
    alert(`You unregistered from tournament #${tournamentId}`)

    setRegisteredTournamentIds((prev) => prev.filter((id) => id !== tournamentId))

    setParticipantsByTournament((prev) => {
      const updated = { ...prev }
      if (updated[tournamentId]) {
        updated[tournamentId] = updated[tournamentId].filter((name) => name !== "You")
      }
      return updated
    })
  }

  const closeModal = () => {
    setShowResultsModal(false)
    setSelectedTournament(null)
    setResults([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-[#FFFACD] font-press bg-[#2a2a27] min-h-screen">
      <h1 className="text-3xl mb-6 text-center">
        {translate("tournaments") || "Tournaments"}
      </h1>

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
                  {tournament.status === "not_started"
                    ? translate("notStarted") || "Not Started"
                    : tournament.status === "ongoing"
                    ? translate("ongoing") || "Ongoing"
                    : translate("finished") || "Finished"}
                </div>
              </div>

              <div className="flex gap-4">
                {tournament.status === "not_started" && (
                  registeredTournamentIds.includes(tournament.id) ? (
                    <button
                      onClick={() => handleUnregister(tournament.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors font-semibold"
                    >
                      {translate("unregister") || "Unregister"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(tournament.id)}
                      className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded hover:bg-opacity-90 transition-colors font-semibold"
                    >
                      {translate("register") || "Register"}
                    </button>
                  )
                )}

                {(tournament.status === "ongoing" || tournament.status === "finished") && (
                  <button
                    onClick={() => handleViewResults(tournament)}
                    className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded hover:bg-opacity-90 transition-colors font-semibold"
                  >
                    {translate("viewResults") || "View Results"}
                  </button>
                )}
              </div>
            </div>

            {/* Participants list visible only if registered */}
            {registeredTournamentIds.includes(tournament.id) && participantsByTournament[tournament.id] && (
              <div className="text-sm mt-2">
                <span className="font-semibold">{translate("participants") || "Participants"}:</span>
                <ul className="list-disc list-inside mt-1">
                  {participantsByTournament[tournament.id].map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
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
    </div>
  )
}