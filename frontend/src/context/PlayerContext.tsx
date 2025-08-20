import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import i18n from 'i18next';

// The Player object that will be stored in our context and localStorage
interface Player {
  id: string
  username: string
  avatar: string
  email: string
  language: string
  googleId?: string | null;
  provider?: string; // ADD THIS LINE
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

  // On initial load, try to get player data from localStorage
  useEffect(() => {
    try {
      const storedPlayer = localStorage.getItem('player');
      if (storedPlayer) {
        const playerData = JSON.parse(storedPlayer);
        setPlayerState(playerData);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Could not parse player from localStorage", error);
      localStorage.removeItem('player');
    }
  }, []);

  // A login function to centralize state and localStorage updates
  const login = (playerData: Player) => {
    setPlayerState(playerData);
    setIsLoggedIn(true);
    localStorage.setItem('player', JSON.stringify(playerData));
  i18n.changeLanguage(playerData.language);
  };

  // A logout function
  const logout = () => {
    setPlayerState(null);
    setIsLoggedIn(false);
    localStorage.removeItem('player');
  };
  
  const setPlayer = (playerData: Player | null) => {
    if (playerData) {
        login(playerData);
    } else {
        logout();
    }
  }

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