import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type GameDisplayProps = {
  wsP1: WebSocket | null;
  wsP2: WebSocket | null;
  onScoreUpdate?: (p1Score: number, p2Score: number) => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  scores?: { p1: number; p2: number };
  players?: { player1: { username: string }; player2: { username: string } };
  gameOver?: boolean;
};

const FIELD_WIDTH = 1020;
const FIELD_HEIGHT = 620;
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 120;
const BALL_SIZE = 20;

type GameState = {
  ballX: number;
  ballY: number;
  p1PaddleY: number;
  p2PaddleY: number;
};

export default function GameDisplay({ wsP1, wsP2, onScoreUpdate, isPaused = false, onTogglePause, scores, players, gameOver }: GameDisplayProps) {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState<GameState>({
    ballX: FIELD_WIDTH / 2,
    ballY: FIELD_HEIGHT / 2,
    p1PaddleY: FIELD_HEIGHT / 2,
    p2PaddleY: FIELD_HEIGHT / 2,
  });

  // Track pressed keys to avoid multiple keydown events for same key
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // The pong-server sends binary data, so we process it as an ArrayBuffer.
      if (e.data instanceof ArrayBuffer) {
        const buffer = e.data;
        const view = new DataView(buffer);

        // Ensure the message has at least a header
        if (buffer.byteLength < 4) return;

        const messageType = view.getUint8(1);
        const MESSAGE_TYPE_STATE_UPDATE = 3; // from defs.h

        if (messageType === MESSAGE_TYPE_STATE_UPDATE) {
          // Don't update game state if paused
          if (isPaused) return;
          
          // Ensure the message has the full state update payload
          if (buffer.byteLength < 22) return; // 4 byte header + 18 byte body

          // The C server uses little-endian for floats and integers in its structs
          const p1_pos_ratio = view.getFloat32(4, true);
          const p2_pos_ratio = view.getFloat32(8, true);
          const ball_x_ratio = view.getFloat32(12, true);
          const ball_y_ratio = view.getFloat32(16, true);

          
          // Extract scores from STATE UPDATE message
          // According to MESSAGE-FORMAT.md: 4 x 1 --- 4 x 2 --- 8 x B --- 2 x S
          // Total body: 4 + 4 + 8 + 2 = 18 bytes
          if (buffer.byteLength >= 22) { // 4 byte header + 18 byte body
            const scoreOffset = 4 + 16; // header (4) + positions (4+4+8 = 16)
            const p1Score = view.getUint8(scoreOffset);
            const p2Score = view.getUint8(scoreOffset + 1);
            
            // Send scores to parent component
            if (onScoreUpdate) {
              onScoreUpdate(p1Score, p2Score);
            }
          }

          // The C server calculates positions based on its own field dimensions (40x20).
          // We must scale these ratios to our frontend's SVG dimensions.
          const PONG_SERVER_FIELD_WIDTH = 40.0;
          const PONG_SERVER_FIELD_HEIGHT = 20.0;

          setGameState({
            p1PaddleY: (p1_pos_ratio / PONG_SERVER_FIELD_HEIGHT) * FIELD_HEIGHT,
            p2PaddleY: (p2_pos_ratio / PONG_SERVER_FIELD_HEIGHT) * FIELD_HEIGHT,
            ballX: (ball_x_ratio / PONG_SERVER_FIELD_WIDTH) * FIELD_WIDTH,
            ballY: (ball_y_ratio / PONG_SERVER_FIELD_HEIGHT) * FIELD_HEIGHT,
          });
        }
      }
    };

    // Tell the WebSockets to receive binary data as an ArrayBuffer
    if (wsP1) wsP1.binaryType = 'arraybuffer';
    if (wsP2) wsP2.binaryType = 'arraybuffer';
    
    // We only need to listen for state updates on one connection
    wsP1?.addEventListener("message", handleMessage);
    wsP2?.addEventListener("message", handleMessage);
    
    return () => {
      wsP1?.removeEventListener("message", handleMessage);
      wsP2?.removeEventListener("message", handleMessage);
    };
  }, [wsP1, wsP2]);

  useEffect(() => {
    const sendBinaryPaddleMove = (ws: WebSocket | null, direction: number) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const buffer = new ArrayBuffer(5);
        const view = new DataView(buffer);
        const PROTOCOL_VERSION = 0;
        const MESSAGE_TYPE_MOVE_PADDLE = 2;
        // Always set bodyLength to 1 and use big-endian
        view.setUint8(0, PROTOCOL_VERSION);
        view.setUint8(1, MESSAGE_TYPE_MOVE_PADDLE);
        view.setUint8(2, 0); // High byte of length (big-endian 1)
        view.setUint8(3, 1); // Low byte of length
        view.setUint8(4, direction);
        ws.send(buffer);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't send paddle moves if game is paused
      if (isPaused) return;
      
      // Prevent default to avoid browser behavior
      e.preventDefault();
      
      // Ignore repeated keydown events for same key
      const key = e.key.toLowerCase();
      
      // Check if key is already pressed to avoid duplicate commands
      if (pressedKeys.has(key)) return;
      
      setPressedKeys((prevKeys: Set<string>) => {
        const newKeys = new Set(prevKeys);
        newKeys.add(key);
        
        // Send movement command based on currently pressed keys
        const MOVE_DIRECTIONS = { DOWN: 1, UP: 2 };
        
        // Player 1 controls (W/S)
        if (key === "w") {
          sendBinaryPaddleMove(wsP1, MOVE_DIRECTIONS.UP);
        } else if (key === "s") {
          sendBinaryPaddleMove(wsP1, MOVE_DIRECTIONS.DOWN);
        }
        // Player 2 controls (P/L)
        else if (key === "p") {
          sendBinaryPaddleMove(wsP2, MOVE_DIRECTIONS.UP);
        } else if (key === "l") {
          sendBinaryPaddleMove(wsP2, MOVE_DIRECTIONS.DOWN);
        }
        
        return newKeys;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't send paddle moves if game is paused
      if (isPaused) return;
      
      e.preventDefault();
      
      const key = e.key.toLowerCase();
      
      setPressedKeys((prevKeys: Set<string>) => {
        const newKeys = new Set(prevKeys);
        newKeys.delete(key);
        
        // Stop movement only if no other movement key is pressed for this player
        const MOVE_DIRECTIONS = { DOWN: 1, UP: 2, STOP: 0 };
        
        // Player 1 controls
        if (key === "w" || key === "s") {
          if (newKeys.has("w")) {
            sendBinaryPaddleMove(wsP1, MOVE_DIRECTIONS.UP);
          } else if (newKeys.has("s")) {
            sendBinaryPaddleMove(wsP1, MOVE_DIRECTIONS.DOWN);
          } else {
            sendBinaryPaddleMove(wsP1, MOVE_DIRECTIONS.STOP);
          }
        }
        // Player 2 controls  
        else if (key === "p" || key === "l") {
          if (newKeys.has("p")) {
            sendBinaryPaddleMove(wsP2, MOVE_DIRECTIONS.UP);
          } else if (newKeys.has("l")) {
            sendBinaryPaddleMove(wsP2, MOVE_DIRECTIONS.DOWN);
          } else {
            sendBinaryPaddleMove(wsP2, MOVE_DIRECTIONS.STOP);
          }
        }
        
        return newKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    // Clear pressed keys when window loses focus
    const handleBlur = () => {
      setPressedKeys(new Set());
      // Send stop commands to both players
      if (wsP1?.readyState === WebSocket.OPEN) {
        sendBinaryPaddleMove(wsP1, 0);
      }
      if (wsP2?.readyState === WebSocket.OPEN) {
        sendBinaryPaddleMove(wsP2, 0);
      }
    };
    
    window.addEventListener("blur", handleBlur);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [wsP1, wsP2, isPaused]);

  // Send pause/continue messages to server when isPaused changes
  useEffect(() => {
    if (wsP1 && wsP2) {
      if (isPaused) {
        // Send pause message to both WebSockets
        const sendPauseMessage = (ws: WebSocket) => {
          if (ws.readyState === WebSocket.OPEN) {
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            const PROTOCOL_VERSION = 0;
            const MESSAGE_TYPE_PAUSE = 1;
            const bodyLength = 0;
            
            view.setUint8(0, PROTOCOL_VERSION);
            view.setUint8(1, MESSAGE_TYPE_PAUSE);
            view.setUint16(2, bodyLength, false); // Big Endian
            ws.send(buffer);
          }
        };
        sendPauseMessage(wsP1);
        sendPauseMessage(wsP2);
      } else {
        // Send continue message to both WebSockets
        const sendContinueMessage = (ws: WebSocket) => {
          if (ws.readyState === WebSocket.OPEN) {
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            const PROTOCOL_VERSION = 0;
            const MESSAGE_TYPE_START_CONTINUE = 0;
            const bodyLength = 0;
            
            view.setUint8(0, PROTOCOL_VERSION);
            view.setUint8(1, MESSAGE_TYPE_START_CONTINUE);
            view.setUint16(2, bodyLength, false); // Big Endian
            ws.send(buffer);
          }
        };
        sendContinueMessage(wsP1);
        sendContinueMessage(wsP2);
      }
    }
  }, [isPaused, wsP1, wsP2]);

  // Clear pressed keys when game is paused or over
  useEffect(() => {
    if (isPaused || gameOver) {
      setPressedKeys(new Set());
    }
  }, [isPaused, gameOver]);

  return (
    <div className="relative flex flex-col items-center space-y-4">
      {/* Scoreboard */}
      {scores && players && !gameOver && (
        <div className="bg-[#20201d] text-[#FFFACD] px-6 py-2 rounded-lg font-press text-2xl shadow-lg border border-[#FFFACD]">
          {players.player1.username} {scores.p1} - {scores.p2} {players.player2.username}
        </div>
      )}

      <div className="relative">
        <svg
          x={-10}
          y={-10}
          width={FIELD_WIDTH}
          height={FIELD_HEIGHT}
          className="bg-[#20201d] border-2 border-[#FFFACD] rounded-xl"
        >
          {/* Center dashed line */}
          <line
            x1={FIELD_WIDTH / 2}
            y1={0}
            x2={FIELD_WIDTH / 2}
            y2={FIELD_HEIGHT}
            stroke="#FFFACD"
            strokeWidth="3"
            strokeDasharray="10,10"
            opacity="0.6"
          />
          {/* Paddle 1 */}
          <rect
            x={0}
            y={gameState.p1PaddleY - PADDLE_HEIGHT / 2}
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
            fill="#FFFACD"
          />
          {/* Paddle 2 */}
          <rect
            x={FIELD_WIDTH - PADDLE_WIDTH}
            y={gameState.p2PaddleY - PADDLE_HEIGHT / 2}
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
            fill="#FFFACD"
          />
          {/* Ball */}
          <circle
            cx={gameState.ballX}
            cy={gameState.ballY}
            r={BALL_SIZE / 2}
            fill="#FFFACD"
          />
        </svg>

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center rounded-xl">
            <div className="text-[#FFFACD] text-center">
              <h2 className="text-4xl font-press mb-4">⏸ {t("PAUSED")}</h2>
              <p className="text-xl font-press mb-2">{t("pressResume")}</p>
              <p className="text-sm font-press opacity-70">{t("gamePaused")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Pause Button - Now below the game */}
      {onTogglePause && (
        <button
          onClick={onTogglePause}
          className="px-4 py-2 bg-[#FFFACD] text-[#20201d] font-press rounded-lg hover:bg-[#e0e0a0] transition-colors flex items-center justify-center"
        >
          <span className="flex items-center">
            {isPaused ? `▶ ${t("resume")}` : `⏸ ${t("pause")}`}
          </span>
        </button>
      )}
    </div>
  );
}