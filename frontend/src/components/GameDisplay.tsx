// src/components/GameDisplay.tsx
import { useEffect, useState } from "react";

type GameDisplayProps = {
  wsP1: WebSocket | null;
  wsP2: WebSocket | null;
};


const FIELD_WIDTH = 1000;
const FIELD_HEIGHT = 600;
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 20;
const DIRECTION = {
  STOP: 0,
  UP: 1,
  DOWN: 2,
};

type GameState = {
  ballX: number;
  ballY: number;
  p1PaddleY: number;
  p2PaddleY: number;
};

export default function GameDisplay({ wsP1, wsP2 }: GameDisplayProps) {
  const [gameState, setGameState] = useState<GameState>({
    ballX: FIELD_WIDTH / 2,
    ballY: FIELD_HEIGHT / 2,
    p1PaddleY: FIELD_HEIGHT / 2,
    p2PaddleY: FIELD_HEIGHT / 2,
  });

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "STATE_UPDATE") {
          setGameState({
            ballX: data.ballX,
            ballY: data.ballY,
            p1PaddleY: data.p1PaddleY,
            p2PaddleY: data.p2PaddleY,
          });
        }
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    };

    wsP1?.addEventListener("message", handleMessage);
    wsP2?.addEventListener("message", handleMessage);

    return () => {
      wsP1?.removeEventListener("message", handleMessage);
      wsP2?.removeEventListener("message", handleMessage);
    };
  }, [wsP1, wsP2]);


  const sendPaddleMove = (ws: WebSocket | null, direction: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ type: "MOVE_PADDLE", direction });
      ws.send(msg);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      switch (e.key) {
        // Player 1 (W / S)
        case "w":
        case "W":
          sendPaddleMove(wsP1, DIRECTION.UP);
          break;
        case "s":
        case "S":
          sendPaddleMove(wsP1, DIRECTION.DOWN);
          break;

        // Player 2 (Arrows)
        case "ArrowUp":
          sendPaddleMove(wsP2, DIRECTION.UP);
          break;
        case "ArrowDown":
          sendPaddleMove(wsP2, DIRECTION.DOWN);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "w":
        case "W":
        case "s":
        case "S":
          sendPaddleMove(wsP1, DIRECTION.STOP);
          break;
        case "ArrowUp":
        case "ArrowDown":
          sendPaddleMove(wsP2, DIRECTION.STOP);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [wsP1, wsP2]);


  return (
    <svg
      width={FIELD_WIDTH}
      height={FIELD_HEIGHT}
      style={{ background: "#20201d", border: "2px solid #FFFACD" }}
    >
      {/* Paddle 1 */}
      <rect
        x={10}
        y={gameState.p1PaddleY - PADDLE_HEIGHT / 2}
        width={PADDLE_WIDTH}
        height={PADDLE_HEIGHT}
        fill="#FFFACD"
      />
      {/* Paddle 2 */}
      <rect
        x={FIELD_WIDTH - 10 - PADDLE_WIDTH}
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
  );
}
