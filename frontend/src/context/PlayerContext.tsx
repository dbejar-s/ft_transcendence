import { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Define the shape of the player context
interface PlayerContextType {
  alias: string | null; // Alias can be null if not logged in or not set
  setAlias: (alias: string | null) => void;
  currentUser: User | null; // Firebase User object
  loadingAuth: boolean; // To track if authentication state is still loading
}

// Create the PlayerContext with default values
const PlayerContext = createContext<PlayerContextType>({
  alias: null,
  setAlias: () => {},
  currentUser: null,
  loadingAuth: true,
});

// Provider component that wraps the app and provides the player context
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [alias, setAlias] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
      // You might want to fetch or set alias here if it's stored in Firebase user profile or Firestore
      // For example, if alias is part of user.displayName, you could do:
      // setAlias(user?.displayName || null);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <PlayerContext.Provider value={{ alias, setAlias, currentUser, loadingAuth }}>
      {children}
    </PlayerContext.Provider>
  );
}

// Custom hook to use the PlayerContext easily
export function usePlayer() {
  return useContext(PlayerContext);
}
