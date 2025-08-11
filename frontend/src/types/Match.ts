export interface Match {
  id: string
  opponent: string
  opponentAvatar: string
  result: "win" | "loss"
  score: string
  gameMode: string
  duration: string
  date: string
}