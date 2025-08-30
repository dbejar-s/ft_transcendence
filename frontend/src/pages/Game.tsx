import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import GameDisplay from "../components/GameDisplay";
import { usePlayer } from "../context/PlayerContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { apiFetch } from '../services/api';

interface Player {
  id: string;
  username: string;
  avatar?: string;
  email?: string;
  language?: string;
}

export default function Game() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { player, setPlayer } = usePlayer() as { player: Player | null; setPlayer: (player: Player | null) => void };
  const [guestName, setGuestName] = useState("Guest");
  const [showOverlay, setShowOverlay] = useState(true);
  const [wsPlayer1, setWsPlayer1] = useState<WebSocket | null>(null);
  const [wsPlayer2, setWsPlayer2] = useState<WebSocket | null>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState<null | { winner: string; loser: string; score: string }>(null);
  const [isPaused, setIsPaused] = useState(false);
  const matchSavedRef = useRef(false);

  // Check if this is a tournament match
  const [tournamentMatch, setTournamentMatch] = useState<any>(null);

  const [players, setPlayers] = useState({
    player1: { username: player?.username || "Player 1" },
    player2: { username: "Guest" }
  });

  // Check for tournament match data only if coming from tournament navigation
  useEffect(() => {
    // Only load tournament data if we came from the tournament page
    // Check if location.state has tournament match data
    if (location.state?.tournamentMatch) {
      const matchData = location.state.tournamentMatch;
      setTournamentMatch(matchData);
      setPlayers({
        player1: { username: matchData.player1 },
        player2: { username: matchData.player2 }
      });
      // Reset match saved state for new tournament match
      matchSavedRef.current = false;
      setGameOver(null);
      console.log('Tournament match loaded from navigation:', matchData);
    }
    // If no tournament data in navigation state, use normal game mode
  }, [location.state]);

  // Function to handle score updates from GameDisplay
  const handleScoreUpdate = (p1Score: number, p2Score: number) => {
	// Invert scores because wsPlayer1 is player 2 and wsPlayer2 is player 1
    setScores({ p1: p1Score, p2: p2Score });
  };

  // Function to check if the current logged-in player is actually playing in this match
  const isCurrentPlayerPlaying = () => {
    if (!player?.username) return false;
    
    // Check if the current player is either player1 or player2
    const isPlaying = (
      players.player1.username === player.username || 
      players.player2.username === player.username
    );
    
    console.log(`[SAVE CHECK] Current player: ${player.username}, Player1: ${players.player1.username}, Player2: ${players.player2.username}, Is playing: ${isPlaying}`);
    
    return isPlaying;
  };

  const handleWsMessage = (event: MessageEvent) => {
	if (!(event.data instanceof ArrayBuffer)) return;

	const view = new DataView(event.data);
	const type = view.getUint8(1);
	const bodyOffset = 4;

	if (type === 2) {
		// GAME OVER message
		const winnerId = view.getUint8(bodyOffset);
		const winner =
		winnerId === 1 ? players.player1.username : players.player2.username;
		const loser =
		winnerId === 1 ? players.player2.username : players.player1.username;

		// Extract final scores from the GAME OVER message
		// According to MESSAGE-FORMAT.md v1: P --- F --- 2 x S
		const finalP1Score = view.getUint8(bodyOffset + 2);
		const finalP2Score = view.getUint8(bodyOffset + 3);

		const gameOverData = {
		winner,
		loser,
		score:
			winnerId === 1
			? `${finalP2Score} - ${finalP1Score}`
			: `${finalP1Score} - ${finalP2Score}`,
		};

		setGameOver(gameOverData);

		// Save the match to database
		// For tournament matches: allow saving by anyone (participants or spectators)
		// For casual matches: only save if the current player is actually playing
		const shouldSaveMatch = tournamentMatch ? true : isCurrentPlayerPlaying();
		
		if (!matchSavedRef.current && shouldSaveMatch) {
			matchSavedRef.current = true;
			saveMatchResult(winnerId, finalP1Score, finalP2Score);
		}
	}
	};

  const startGame = async () => {
    // Allow guests to play - they will get a temporary profile created automatically
    setShowOverlay(false);
    
    // Reset match saved state for new game
    matchSavedRef.current = false;
    setGameOver(null);
    
    // Only update player2 name if this is NOT a tournament match
    if (!tournamentMatch) {
      setPlayers(prev => ({ ...prev, player2: { username: guestName } }));
    }

    try {
      // For guests (no player.id), use a placeholder or guest endpoint
      const playerId = player?.id || 'guest';
      
      const data = await apiFetch(`/api/users/${playerId}/matches/start`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player1Name: tournamentMatch ? tournamentMatch.player1 : (player?.username || 'Guest'),
          player2Name: tournamentMatch ? tournamentMatch.player2 : guestName,
          gameMode: tournamentMatch ? 'Tournament' : 'Casual'
        })
      });

      console.log("Match started, received WebSocket URLs:", data);

      // If a guest profile was created, update the player context (only for non-tournament games)
      if (data.guestProfile && !player?.id && !tournamentMatch) {
        const guestPlayer = {
          id: data.guestProfile.id,
          username: data.guestProfile.username,
          avatar: '/assets/Profile/men1.png', // Default avatar for guests
          email: `${data.guestProfile.username}@guest.com`,
          language: 'en'
        };
        setPlayer(guestPlayer);
        setPlayers(prev => ({ ...prev, player1: { username: guestPlayer.username } }));
        console.log('[GAME] Created guest profile:', guestPlayer);
      }

      if (data.wsUrls && data.wsUrls.length >= 2) {
        const ws1 = new WebSocket(data.wsUrls[0]);
        const ws2 = new WebSocket(data.wsUrls[1]);

        ws1.onmessage = handleWsMessage;
        ws2.onmessage = handleWsMessage;

        // Send QUIT message when leaving the page
        const handleBeforeUnload = () => {
          const sendQuitMessage = (ws: WebSocket) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              const buffer = new ArrayBuffer(4);
              const view = new DataView(buffer);
              const PROTOCOL_VERSION = 0;
              const MESSAGE_TYPE_QUIT = 3;
              const bodyLength = 0;

              view.setUint8(0, PROTOCOL_VERSION);
              view.setUint8(1, MESSAGE_TYPE_QUIT);
              view.setUint16(2, bodyLength, false); // Big Endian
              ws.send(buffer);
            }
          };
          
          sendQuitMessage(ws1);
          sendQuitMessage(ws2);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        const sendStartMessage = (ws: WebSocket) => {
            // This is the command the C server needs to unpause the game.
            // Format: 1 byte version, 1 byte type, 2 bytes length. No body.
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            const PROTOCOL_VERSION = 0;
            const MESSAGE_CLIENT_START = 0; // Type 0 is START
            const bodyLength = 0;

            view.setUint8(0, PROTOCOL_VERSION);
            view.setUint8(1, MESSAGE_CLIENT_START);
            view.setUint16(2, bodyLength, false); // Big Endian
            ws.send(buffer);
        };

        // When each WebSocket connects, send the start message.
        ws1.onopen = () => {
            console.log("Player 1 WebSocket connected. Sending START message.");
            sendStartMessage(ws1);
        };
        ws2.onopen = () => {
            console.log("Player 2 WebSocket connected. Sending START message.");
            sendStartMessage(ws2);
        };

        setWsPlayer1(ws1);
        setWsPlayer2(ws2);
      } else {
        console.error("No WebSocket URLs received from backend");
      }
    } catch (err) {
      console.error("Fetch error", err);
    }
  };

	useEffect(() => {
	return () => {
		// This will run when the component unmounts (e.g., navigating away)
		// Send QUIT message to both WebSocket connections
		if (wsPlayer1) {
		const buffer = new ArrayBuffer(4);
		const view = new DataView(buffer);
		view.setUint8(0, 0);
		view.setUint8(1, 3); // QUIT
		view.setUint16(2, 0, false);
		wsPlayer1.send(buffer);
		wsPlayer1.close();
		}
		if (wsPlayer2) {
		const buffer = new ArrayBuffer(4);
		const view = new DataView(buffer);
		view.setUint8(0, 0);
		view.setUint8(1, 3); // QUIT
		view.setUint16(2, 0, false);
		wsPlayer2.send(buffer);
		wsPlayer2.close();
		}
	};
	}, [location]);

  // Function to save match result to database
  const saveMatchResult = async (winnerId: number, p1Score: number, p2Score: number) => {
    // For tournament matches, allow saving even if not a participant (for spectators/guests)
    // For casual matches, only allow saving if logged in
    if (!tournamentMatch && !player?.id) {
      console.log('[GAME] Cannot save casual match - user not logged in');
      return;
    }

    try {
      // Determine the actual winner based on the game result
      let actualWinnerId = null;
      
      if (tournamentMatch) {
        // For tournaments, determine winner from tournament match data
        if (winnerId === 1) {
          // Player1 in the game won
          // Find which actual player corresponds to game player1
          if (players.player1.username === tournamentMatch.player1) {
            actualWinnerId = tournamentMatch.player1Id;
          } else if (players.player1.username === tournamentMatch.player2) {
            actualWinnerId = tournamentMatch.player2Id;
          }
        } else if (winnerId === 2) {
          // Player2 in the game won
          // Find which actual player corresponds to game player2
          if (players.player2.username === tournamentMatch.player1) {
            actualWinnerId = tournamentMatch.player1Id;
          } else if (players.player2.username === tournamentMatch.player2) {
            actualWinnerId = tournamentMatch.player2Id;
          }
        }
      } else {
        // For casual games, send the game winner number (1 or 2) and let backend determine actual winner ID
        actualWinnerId = winnerId; // Just pass through the game winner number
      }
      
      const matchData = {
        player1Name: players.player1.username, // Name of player1 in the game
        player2Name: players.player2.username, // Name of player2 in the game
        player1Score: p1Score, // Score of player1 in the game
        player2Score: p2Score, // Score of player2 in the game
        winnerId: actualWinnerId, // For casual: 1 or 2. For tournament: actual player ID
        gameMode: tournamentMatch ? 'Tournament' : 'Casual',
        tournamentId: tournamentMatch?.tournamentId || null,
        playedAt: new Date().toISOString()
      };

      console.log('[GAME] Saving match result:', matchData);
      console.log('[GAME] Tournament match data:', tournamentMatch);
      console.log('[GAME] Current player:', { id: player?.id, username: player?.username });
      console.log('[GAME] Game players:', players);
      console.log('[GAME] Winner determination: gameWinner=' + winnerId + ', actualWinnerId=' + actualWinnerId);
      await apiFetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(matchData)
      });

      console.log('Match saved successfully');
      // Dispatch custom event to notify components to refresh
      window.dispatchEvent(new CustomEvent('matchCompleted'));
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  // Function to toggle pause
  const togglePause = () => {
    if (!gameOver && !showOverlay) {
      setIsPaused(!isPaused);
    }
  };

  // Handle spacebar press for pause
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !gameOver && !showOverlay) {
        event.preventDefault();
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isPaused, gameOver, showOverlay]);

  // Check if user has token but no player data - fetch from API
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (token && !player) {
        try {
          console.log('[GAME] Token found but no player data, fetching from API...');
          const userData = await apiFetch('/api/users/current');
          console.log('[GAME] Fetched user data:', userData);
          setPlayer({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            avatar: userData.avatar || '/assets/Profile/men1.png',
            language: userData.language || 'en'
          });
        } catch (error) {
          console.error('[GAME] Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [player, setPlayer]);

  // Update player1 name when user data is loaded (for non-tournament games)
  useEffect(() => {
    if (player?.username && !tournamentMatch && !location.state?.tournamentMatch) {
      setPlayers(prev => ({ 
        ...prev, 
        player1: { username: player.username } 
      }));
    }
  }, [player?.username, tournamentMatch, location.state?.tournamentMatch]);

  // Update player2 name when guestName changes (for non-tournament games)
  useEffect(() => {
    if (!tournamentMatch && !location.state?.tournamentMatch) {
      setPlayers(prev => ({ 
        ...prev, 
        player2: { username: guestName } 
      }));
    }
  }, [guestName, tournamentMatch, location.state?.tournamentMatch]);

  return (
    <div className="min-h-screen flex flex-col bg-[#2a2a27] relative overflow-hidden">      {showOverlay && (
        // Initial Overlay with instructions and guest name input
        <div className="absolute inset-0 bg-black bg-opacity-70 z-20 flex flex-col justify-center items-center p-8 text-white text-center">
          <div className="max-w-xl bg-[#55534e] bg-opacity-90 p-6 rounded-xl shadow-lg space-y-4 border border-[#FFFACD]">
            <h2 className="text-2xl font-press text-[#FFFACD]">
              {t("howToPlayTitle") || "How to Play"}
            </h2>

            {/* Show tournament match info or guest name input */}
            {tournamentMatch ? (
              <div className="space-y-2">
                <h3 className="text-xl font-press text-[#FFFACD]">{t("movePaddle")} {tournamentMatch.player1} {t("w/s")} {tournamentMatch.player2} {t("score11")}</h3>
				<p className="text-sm font-press text-yellow-300">
				{t("pressPlay") || "Press SPACE to pause/resume the game anytime"}
				</p>
                <p className="text-lg font-press text-yellow-400">
                  {tournamentMatch.player1} vs {tournamentMatch.player2}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
		      	<p className="text-base font-press">
					{t("howToPlayText") ||
					"Player 1: W/S Keys | Player 2: P/L Keys"}
			  	</p>
				<p className="text-sm font-press text-yellow-300">
				  {t("pressPlay") || "Press SPACE to pause/resume the game anytime"}
				</p>
                <h2 className="text-2xl font-press text-[#FFFACD]">{t("guestName")}</h2>
                <input
                  type="text"
                  placeholder={t("guestName")}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2 font-press rounded-lg text-[#20201d] border border-[#FFFACD]"
                />
              </div>
            )}

            <button
              onClick={startGame}
              className="font-press text-base bg-[#FFFACD] text-[#20201d] px-6 py-3 rounded-lg border-2 border-transparent hover:border-[#FFFACD] hover:bg-[#20201d] hover:text-[#FFFACD] transition duration-200"
            >
              {t("startGame") || "Start Game"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col items-center justify-center p-4 mb-2 text-3xl font-press text-[#FFFACD]">

        {!showOverlay && (
          <GameDisplay 
            wsP1={wsPlayer1} 
            wsP2={wsPlayer2} 
            onScoreUpdate={handleScoreUpdate}
            isPaused={isPaused}
            onTogglePause={togglePause}
            scores={scores}
            players={players}
            gameOver={!!gameOver}
          />
        )}

		{/* Game Over Overlay */}
		{gameOver && (
		<div className="absolute inset-0 bg-black bg-opacity-80 z-30 flex flex-col justify-center items-center text-white">
			<div className="bg-[#55534e] bg-opacity-95 p-8 rounded-xl shadow-lg border border-[#FFFACD] text-center space-y-4">
			<h2 className="text-3xl font-press text-[#FFFACD]">Game Over</h2>
			<p className="text-xl font-press">
				Winner: <span className="text-green-400">{gameOver.winner}</span>
			</p>
			<p className="text-lg font-press">
				Loser: <span className="text-red-400">{gameOver.loser}</span>
			</p>
			<p className="text-lg font-press">{t("finalScore")}:  {gameOver.score}</p>
			
			{/* Different buttons for tournament vs casual games */}
			{tournamentMatch ? (
				<button
					onClick={() => navigate('/tournament')}
					className="font-press mt-4 bg-[#FFFACD] text-[#20201d] px-6 py-3 rounded-lg hover:bg-[#20201d] hover:text-[#FFFACD] border-2 border-transparent hover:border-[#FFFACD] transition"
				>
					{t("backToTournament") || "Back to Tournament"}
				</button>
			) : (
				<button
					onClick={() => window.location.reload()}
					className="font-press mt-4 bg-[#FFFACD] text-[#20201d] px-6 py-3 rounded-lg hover:bg-[#20201d] hover:text-[#FFFACD] border-2 border-transparent hover:border-[#FFFACD] transition"
				>
					{t("playAgain") || "Play Again"}
				</button>
			)}
			</div>
		</div>
		)}
      </div>
    </div>
  );
}