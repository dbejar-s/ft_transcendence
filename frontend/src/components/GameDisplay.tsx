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
      // The pong-server sends binary data, so we process it as an ArrayBuffer.
      if (e.data instanceof ArrayBuffer) {
        const buffer = e.data;
        const view = new DataView(buffer);

        // Ensure the message has at least a header
        if (buffer.byteLength < 4) return;

        const messageType = view.getUint8(1);
        const MESSAGE_TYPE_STATE_UPDATE = 3; // from defs.h

        if (messageType === MESSAGE_TYPE_STATE_UPDATE) {
          // Ensure the message has the full state update payload
          if (buffer.byteLength < 22) return; // 4 byte header + 18 byte body

          // The C server uses little-endian for floats and integers in its structs
          const p1_pos_ratio = view.getFloat32(4, true);
          const p2_pos_ratio = view.getFloat32(8, true);
          const ball_x_ratio = view.getFloat32(12, true);
          const ball_y_ratio = view.getFloat32(16, true);

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
    
    return () => {
      wsP1?.removeEventListener("message", handleMessage);
    };
  }, [wsP1]);

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
        // Debug: print buffer bytes before sending
        const bytes = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.debug(`[PADDLE MOVE] Sending buffer: ${bytes}, direction=${direction}`);
        ws.send(buffer);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const MOVE_DIRECTIONS = { UP: 1, DOWN: 2 };

      switch (e.key) {
        case "s": case "S":
          sendBinaryPaddleMove(wsP1, MOVE_DIRECTIONS.UP);
          break;
        case "w": case "W":
          sendBinaryPaddleMove(wsP1, MOVE_DIRECTIONS.DOWN);
          break;
        case "l": case "L":
          sendBinaryPaddleMove(wsP2, MOVE_DIRECTIONS.UP);
          break;
        case "p": case "P":
          sendBinaryPaddleMove(wsP2, MOVE_DIRECTIONS.DOWN);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const MOVE_DIRECTION_STOP = 0;
      switch (e.key) {
        case "s": case "S": case "w": case "W":
          sendBinaryPaddleMove(wsP1, MOVE_DIRECTION_STOP);
          break;
        case "p": case "P": case "l": case "L":
          sendBinaryPaddleMove(wsP2, MOVE_DIRECTION_STOP);
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