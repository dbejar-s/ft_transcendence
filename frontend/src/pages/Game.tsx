// frontend/src/pages/Game.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import GameDisplay from "../components/GameDisplay";
import { usePlayer } from "../context/PlayerContext";

interface Player {
  id: string;
  username: string;
  avatar?: string;
}

export default function Game() {
  const { t } = useTranslation();
  const { player } = usePlayer() as { player: Player };
  const [guestName, setGuestName] = useState("Guest");
  const [showOverlay, setShowOverlay] = useState(true);
  const [wsPlayer1, setWsPlayer1] = useState<WebSocket | null>(null);
  const [wsPlayer2, setWsPlayer2] = useState<WebSocket | null>(null);

  const [players, setPlayers] = useState({
    player1: { username: player?.username || "Player 1" },
    player2: { username: "Guest" }
  });

  const startGame = async () => {
    if (!player?.id) {
      console.error("No player.id set");
      alert("You must be logged in to start a game.");
      return;
    }
    setShowOverlay(false);
    setPlayers(prev => ({ ...prev, player2: { username: guestName } }));

    try {
      const backendUrl = 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/users/${player.id}/matches/start`, { method: "POST" });

      if (!res.ok) {
        console.error("Server error", res.status, await res.text());
        return;
      }

      const data = await res.json();
      console.log("Match started, received WebSocket URLs:", data);

      if (data.wsUrls && data.wsUrls.length >= 2) {
        const ws1 = new WebSocket(data.wsUrls[0]);
        const ws2 = new WebSocket(data.wsUrls[1]);

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


  return (
    <div className="min-h-screen flex flex-col bg-[#2a2a27] relative overflow-hidden">
      {showOverlay && (
        <div className="absolute inset-0 bg-black bg-opacity-70 z-20 flex flex-col justify-center items-center p-8 text-white text-center">
          <div className="max-w-xl bg-[#55534e] bg-opacity-90 p-6 rounded-xl shadow-lg space-y-4 border border-[#FFFACD]">
            <h2 className="text-2xl font-press text-[#FFFACD]">
              {t("howToPlayTitle") || "How to Play"}
            </h2>
            <p className="text-base font-press">
              {t("howToPlayText") ||
                "Player 1: W/S Keys | Player 2: Arrow Keys"}
            </p>

            <h2 className="text-2xl font-press text-[#FFFACD]">{"Guest name"}</h2>
            <input
              type="text"
              placeholder={"Guest name"}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-4 py-2 font-press rounded-lg text-[#20201d] border border-[#FFFACD]"
            />

            <button
              onClick={startGame}
              className="font-press text-base bg-[#FFFACD] text-[#20201d] px-6 py-3 rounded-lg border-2 border-transparent hover:border-[#FFFACD] hover:bg-[#20201d] hover:text-[#FFFACD] transition duration-200"
            >
              {t("startGame") || "Start Game"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-press text-[#FFFACD] mb-2 w-full max-w-4xl flex items-center justify-center">
          <span className="max-w-[40%] text-right truncate">{players.player1.username}</span>
          <span className="px-6 text-center flex-shrink-0">vs</span>
          <span className="max-w-[40%] text-left truncate">{players.player2.username}</span>
        </h2>
        {!showOverlay && (
          <GameDisplay wsP1={wsPlayer1} wsP2={wsPlayer2} />
        )}
      </div>
    </div>
  );
}