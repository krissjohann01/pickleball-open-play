export type SkillLevel =
  | 'novice_beginner'
  | 'advanced_beginner'
  | 'intermediate'
  | 'advanced_intermediate'
  | 'advanced_competitive'
  | 'pro_open'

export interface Player {
  id: string
  name: string
  level: SkillLevel
}

export interface FoodOrder {
  id: string
  description: string
  amount: number
}

export interface SessionPlayer {
  id: string
  name: string
  level: SkillLevel
  gamesPlayed: number
  /** Session-wide turn counter value at the moment this player was last assigned to
   * a court — used to prioritize whoever has been waiting longest. */
  lastPlayedSeq: number
  partnerHistory: string[]
  /** True if the player has stepped away and should be skipped by matchmaking until resumed. */
  paused: boolean
  /** Food/drinks this player personally ordered — billed to them alone, on top of their court share. */
  foodOrders: FoodOrder[]
}

export interface CourtSlot {
  courtNumber: number
  /** Editable display name (defaults to "Court {courtNumber}") — lets the
   * organizer match whatever physical court numbers the venue assigned. */
  label: string
  /** null until the court's first game is generated. */
  playerIds: string[] | null
  gamesOnCourt: number
}

export interface Session {
  numCourts: number
  durationMinutes: number
  startedAt: number
  /** Set when the organizer ends the session — session data stays around so the
   * summary can render, but matchmaking stops. Null while still in progress. */
  endedAt: number | null
  turnCounter: number
  players: SessionPlayer[]
  courts: CourtSlot[]
  /** Total cost to rent the court(s) for the session, split evenly across all players. */
  courtRentalTotal: number
  /** Flat fee each individual player pays on top of their share of the rental. */
  entranceFeePerPerson: number
}
