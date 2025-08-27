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

  // Update the number of participants and the names array (excluding the real logged-in user)
  const handleNumParticipantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Math.max(3, Number(e.target.value));
    setNumParticipants(n);
    setParticipantNames((prev) => {
      const arr = [...prev];
      // We need n-1 participants since the logged-in user is always the creator
      const targetLength = n - 1;
      while (arr.length < targetLength) arr.push("");
      while (arr.length > targetLength) arr.pop();
      return arr;
    });
  };

  // Update a participant's name (these are temporary users)
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
      console.log('Creating tournament with logged-in user:', player.username, 'ID:', player.id);
      
      if (!token) {
        alert("You must be logged in to create a tournament.");
        return;
      }

      // Create tournament (automatically ongoing)
      const res = await fetch("http://localhost:3001/api/tournaments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTournamentName,
          gameMode: "pong",
          status: "ongoing", // Directement en mode 'ongoing'
          maxPlayers: numParticipants,
        }),
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(errorText);
      }
      
      const { tournamentId } = await res.json();
      console.log('Tournament created with ID:', tournamentId);

      // Add other participants as TEMPORARY users
      for (const name of participantNames) {
        console.log('Creating temporary user:', name);
        
        // Create a temporary user for each participant
        const userRes = await fetch("http://localhost:3001/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: name,
            isTemporary: true
          }),
        });
        
        if (!userRes.ok) {
          console.error('Failed to create temporary user:', name);
          continue;
        }
        
        const user = await userRes.json();
        console.log('Created temporary user:', user);
        
        // Register the temporary user in the tournament
        const registerRes = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/register`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id }),
        });
        
        if (!registerRes.ok) {
          console.error('Failed to register temporary user:', name);
        } else {
          console.log('Registered temporary user:', name, 'in tournament');
        }
      }

      // Create matches automatically after all participants are registered
      await createTournamentMatches(tournamentId, token);

      alert('Tournament created and started successfully!');

      setShowCreateModal(false);
      setNewTournamentName("");
      setNumParticipants(3);
      setParticipantNames(["", ""]);
      setRefreshKey((k: number) => k + 1);
      
    } catch (err: any) {
      console.error('Full error:', err);
      if (err instanceof Error) {
        alert("Error creating tournament: " + err.message);
      } else {
        alert("Error creating tournament");
      }
    }
  };

  // Nouvelle fonction pour créer les matches automatiquement
  const createTournamentMatches = async (tournamentId: number, token: string) => {
    try {
      console.log('Creating matches for tournament:', tournamentId);
      
      // Récupérer tous les participants
      const participantsRes = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/participants`);
      const participants = await participantsRes.json();
      
      console.log('Participants for matches:', participants);
      
      if (participants.length < 2) {
        console.error('Not enough participants to create matches');
        return;
      }

      // Créer tous les matches (Round 1: tout le monde contre tout le monde)
      const matchesCreated = [];
      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const matchData = {
            tournamentId: tournamentId,
            player1Id: participants[i].id,
            player2Id: participants[j].id,
            round: 1,
            phase: 'round_1',
            status: 'pending'
          };
          
          console.log('Creating match:', participants[i].username, 'vs', participants[j].username);
          
          // Créer le match via l'API
          const createMatchRes = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/create-match`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(matchData)
          });
          
          if (createMatchRes.ok) {
            matchesCreated.push(matchData);
            console.log('✅ Match created successfully');
          } else {
            console.error('❌ Failed to create match');
          }
        }
      }
      
      console.log(`Created ${matchesCreated.length} matches for tournament ${tournamentId}`);
      
    } catch (error) {
      console.error('Error creating tournament matches:', error);
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
            
            {/* Show current logged-in user as Creator (non-editable) */}
            <div className="p-3 bg-blue-900 rounded">
              <label className="text-blue-200">
                {translate("creator") || "Creator"} ({translate("you") || "You"})
                <input
                  className="block w-full mt-1 p-2 rounded text-[#20201d] bg-blue-200 font-bold"
                  value={`${player?.username} (Your Account)`}
                  disabled
                  readOnly
                />
              </label>
              <small className="text-blue-300">
                ℹ️ Your tournament results will be saved to your account statistics
              </small>
            </div>
            
            {/* Other participants - these will be temporary users */}
            <div className="border-t border-gray-600 pt-3">
              <h4 className="text-sm text-gray-300 mb-2">
                {translate("otherParticipants") || "Other Participants"} (Temporary Users)
              </h4>
              {participantNames.map((name: string, i: number) => (
                <label key={i} className="block mb-2">
                  {translate("participant") || "Participant"} {i + 2}
                  <input
                    className="block w-full mt-1 p-2 rounded text-[#20201d]"
                    value={name}
                    onChange={(e: any) => handleParticipantNameChange(i, e.target.value)}
                    placeholder="Enter name for temporary participant"
                    required
                  />
                </label>
              ))}
              <small className="text-gray-400">
                ℹ️ These will be temporary accounts for this tournament only
              </small>
            </div>
            
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