import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlayer } from "../context/PlayerContext"
import TournamentList from "../components/tournaments/TournamentList";

export default function TournamentPage() {
  const { t: translate } = useTranslation()
  const { player } = usePlayer()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTournamentName, setNewTournamentName] = useState("")
  const [numParticipants, setNumParticipants] = useState(3)
  const [participantNames, setParticipantNames] = useState<string[]>(["", ""])
  const [refreshKey, setRefreshKey] = useState(0);

  // Update the number of participants and the names array (excluding player1 who is always the current user)
  const handleNumParticipantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Math.max(3, Number(e.target.value));
    setNumParticipants(n);
    setParticipantNames((prev) => {
      const arr = [...prev];
      // We need n-1 participants since player1 is always the current user
      const targetLength = n - 1;
      while (arr.length < targetLength) arr.push("");
      while (arr.length > targetLength) arr.pop();
      return arr;
    });
  };

  // Update a participant's name (excluding player1)
  const handleParticipantNameChange = (i: number, value: string) => {
    setParticipantNames((prev) => {
      const arr = [...prev];
      arr[i] = value;
      return arr;
    });
  };

  // Create tournament
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName) return;
    if (!player) {
      alert("You must be logged in to create a tournament.");
      return;
    }
    if (participantNames.length < 2) return;
    
    // Check uniqueness of participant names (excluding the current user)
    const namesSet = new Set(participantNames.map((n: string) => n.trim()).filter(Boolean));
    if (namesSet.size !== participantNames.length || participantNames.some((n: string) => !n.trim())) {
      alert("All participant names must be filled and unique.");
      return;
    }
    
    // Ensure current user name is not in the participant names
    if (participantNames.some((n: string) => n.trim() === player.username)) {
      alert(`You are already registered as the tournament creator. Please use different names for other participants.`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("You must be logged in to create a tournament.");
        return;
      }

      // Create tournament (current user will be automatically registered as creator)
      const res = await fetch("http://localhost:3001/api/tournaments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTournamentName,
          gameMode: "pong",
          status: "registration",
          maxPlayers: numParticipants,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      const { tournamentId } = await res.json();

      // Add other participants (current user is already added by the backend)
      for (const name of participantNames) {
        // Create a temporary user for each participant (or adapt according to your model)
        const userRes = await fetch("http://localhost:3001/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name }),
        });
        const user = await userRes.json();
        await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/register`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id }),
        });
      }

      await fetch(`http://localhost:3001/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ongoing" }),
      });

      setShowCreateModal(false);
      setNewTournamentName("");
      setNumParticipants(3);
      setParticipantNames(["", ""]);
      setRefreshKey((k: number) => k + 1);
    } catch (err: any) {
      if (err instanceof Error) {
        alert("Error creating tournament: " + err.message);
      } else {
        alert("Error creating tournament");
      }
    }
  };

  return (
    <div className="p-6 space-y-6 text-[#FFFACD] font-press bg-[#2a2a27] min-h-screen">
      <h1 className="text-3xl mb-6 text-center">
        {translate("tournaments") || "Tournaments"}
      </h1>

      {/* Create Tournament Button */}
      <div className="flex justify-end mb-4">
        <button
          className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-bold hover:opacity-80"
          onClick={() => setShowCreateModal(true)}
        >
          {translate("createTournament") || "Create Tournament"}
        </button>
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <form
            className="bg-[#20201d] p-6 rounded-lg max-w-md w-full text-[#FFFACD] relative shadow-lg flex flex-col gap-4"
            onSubmit={handleCreateTournament}
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-3 right-3 text-red-400 hover:text-red-300 font-bold text-xl"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl mb-2 text-center">{translate("createTournament") || "Create Tournament"}</h2>
            <label>
              {translate("tournamentName") || "Tournament Name"}
              <input
                className="block w-full mt-1 p-2 rounded text-[#20201d]"
                value={newTournamentName}
                onChange={e => setNewTournamentName(e.target.value)}
                required
              />
            </label>
            <label>
              {translate("numberOfParticipants") || "Number of participants (min 3)"}
              <input
                type="number"
                min={3}
                value={numParticipants}
                onChange={handleNumParticipantsChange}
                className="block w-full mt-1 p-2 rounded text-[#20201d]"
                required
              />
            </label>
            
            {/* Show current user as Player 1 (non-editable) */}
            <label>
              {translate("player") || "Player"} 1 ({translate("you") || "You"})
              <input
                className="block w-full mt-1 p-2 rounded text-[#20201d] bg-gray-200"
                value={player?.username || ""}
                disabled
                readOnly
              />
            </label>
            
            {/* Other participants */}
            {participantNames.map((name: string, i: number) => (
              <label key={i}>
                {translate("player") || "Player"} {i + 2}
                <input
                  className="block w-full mt-1 p-2 rounded text-[#20201d]"
                  value={name}
                  onChange={(e: any) => handleParticipantNameChange(i, e.target.value)}
                  required
                />
              </label>
            ))}
            <button
              type="submit"
              className="bg-[#FFFACD] text-[#20201d] px-4 py-2 rounded font-bold hover:opacity-80 mt-2"
            >
              {translate("create") || "Create"}
            </button>
          </form>
        </div>
      )}

      <TournamentList refreshKey={refreshKey} />
    </div>
  );
}