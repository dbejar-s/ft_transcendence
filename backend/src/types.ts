import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      username: string
    }
  }
}

export interface Tournament {
  id: number
  name: string
  gameMode: string
  status?: 'registration' | 'ongoing' | 'finished' 
  phase?: string
  maxPlayers?: number
  startDate?: string
  endDate?: string
  winnerId?: string
}

export interface TournamentParticipant {
  userId: string
  username?: string
  avatar?: string
  status?: string
}

export interface FriendRequest {
  userId: number
  friendId: number
}