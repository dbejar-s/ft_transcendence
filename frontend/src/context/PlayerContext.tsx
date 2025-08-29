import { createContext, useContext, useState, type ReactNode, useEffect, useCallback } from "react"
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