import { createContext, useContext, useState } from 'react';

// Define the shape of the player context
interface PlayerContextType {
  alias: string;
  setAlias: (alias: string) => void;
}

// Create the PlayerContext with default values
const PlayerContext = createContext<PlayerContextType>({
  alias: '',
  setAlias: () => {},
});

// Provider component that wraps the app and provides the player context
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [alias, setAlias] = useState('');

  return (
    <PlayerContext.Provider value={{ alias, setAlias }}>
      {children}
    </PlayerContext.Provider>
  );
}

// Custom hook to use the PlayerContext easily
export function usePlayer() {
  return useContext(PlayerContext);
}
