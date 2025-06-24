import { createContext, useContext, useState, type ReactNode } from "react"

interface Player {
  id: string
  username: string
  avatar: string
  email: string
  language: string
}

interface PlayerContextType {
  player: Player | null
  setPlayer: (player: Player | null) => void
  isLoggedIn: boolean
  setIsLoggedIn: (value: boolean) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <PlayerContext.Provider value={{ player, setPlayer, isLoggedIn, setIsLoggedIn }}>{children}</PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return context
}
