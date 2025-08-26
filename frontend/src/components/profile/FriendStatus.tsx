import React from "react";
import { useEffect, useRef } from "react";
import type { Friend } from "./FriendProfile";

export function useFriendStatus(userId: string, setFriends: React.Dispatch<React.SetStateAction<Friend[]>>) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3001/ws?userId=${encodeURIComponent(userId)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected for status updates");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "statusUpdate") {
        setFriends((prev: Friend[]) =>
          prev.map((f: Friend) => f.id === msg.userId ? { ...f, status: msg.status } : f)
        );
      }
    };

    ws.onclose = () => console.log("WS closed");
    ws.onerror = (err) => console.error("WS error", err);

    return () => {
      ws.close();
    };
  }, [userId, setFriends]);
}