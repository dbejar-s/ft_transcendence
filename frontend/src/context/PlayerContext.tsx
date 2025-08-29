import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useRef } from "react"
import i18n from 'i18next';

// The Player object that will be stored in our context and localStorage
interface Player {
  id: string
  username: string
  avatar: string
  email: string
  language: string
  googleId?: string | null;
  provider?: string;
}

interface PlayerContextType {
  player: Player | null
  login: (playerData: Player) => void;
  logout: () => void;
  isLoggedIn: boolean;
  setPlayer: (player: Player | null) => void
  setIsLoggedIn: (value: boolean) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayerState] = useState<Player | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection management
  useEffect(() => {
    console.log("PlayerContext WebSocket effect triggered:", {
      playerId: player?.id,
      playerUsername: player?.username, 
      isLoggedIn,
      hasPlayer: !!player
    });
    
    if (player?.id && isLoggedIn) {
      console.log("Establishing global WebSocket connection for:", player.username, "ID:", player.id);
      const ws = new WebSocket(`wss://localhost:3001/ws?userId=${encodeURIComponent(player.id)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Global WS connected for user:", player.username, "ID:", player.id);
      };

      ws.onmessage = (event) => {
        console.log("📨 Global WS message received:", event.data, "for user:", player.username);
        // Ici on pourrait dispatcher des événements customisés
        // pour que les composants puissent écouter les changements de statut
        const msg = JSON.parse(event.data);
        if (msg.type === "statusUpdate") {
          console.log("👥 Dispatching friend status update:", msg.userId, "->", msg.status);
          // Dispatch custom event for components to listen to
          window.dispatchEvent(new CustomEvent('friendStatusUpdate', { 
            detail: { userId: msg.userId, status: msg.status } 
          }));
        }
      };

      ws.onclose = () => {
        console.log("❌ Global WS closed for user:", player.username);
      };

      ws.onerror = (err) => {
        console.error("🚫 Global WS error for user:", player.username, err);
      };

      return () => {
        console.log("🧹 Cleaning up global WebSocket for:", player.username);
        ws.close();
      };
    } else {
      console.log("❌ Not establishing WebSocket connection - missing requirements:", {
        hasPlayerId: !!player?.id,
        isLoggedIn
      });
    }
  }, [player?.id, player?.username, isLoggedIn]);

  // On initial load, check if we have a token but DON'T load player data from localStorage
  // Let the components fetch fresh data from the API instead
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        setIsLoggedIn(true);
        // Don't auto-load player data from localStorage
        // Let components fetch fresh data from API
      }
    } catch (error) {
      console.error("Error checking login status", error);
      localStorage.removeItem('token');
      localStorage.removeItem('player');
    }
  }, []);

  // A login function to centralize state and localStorage updates
  const login = useCallback((playerData: Player) => {
    try {
      // Validate required fields
      if (!playerData || !playerData.id || !playerData.email || !playerData.username) {
        console.error('Invalid player data provided to login:', playerData);
        return;
      }
      
      setPlayerState(playerData);
      setIsLoggedIn(true);
      localStorage.setItem('player', JSON.stringify(playerData));
      i18n.changeLanguage(playerData.language);
    } catch (error) {
      console.error('Error in login function:', error);
    }
  }, []);

  // A logout function
  const logout = useCallback(() => {
    setPlayerState(null);
    setIsLoggedIn(false);
    localStorage.removeItem('player');
    localStorage.removeItem('token');
  }, []);
  
  const setPlayer = useCallback((playerData: Player | null) => {
    if (playerData) {
        login(playerData);
    } else {
        logout();
    }
  }, [login, logout]);

  const value = { player, login, logout, isLoggedIn, setIsLoggedIn, setPlayer };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return context
}