import type { Player, Session, SessionPlayer } from './types'
import { generateId } from './id'

const PLAYERS_PER_COURT = 4
const VARIETY_ATTEMPTS = 25

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Players not currently on any *other* court — i.e. free to be assigned to
 * `courtNumber`. Includes players presently on `courtNumber` itself, since
 * refilling that court frees them up first. */
export function getWaitingPool(session: Session, courtNumber: number): SessionPlayer[] {
  const busy = new Set<string>()
  for (const court of session.courts) {
    if (court.courtNumber === courtNumber) continue
    court.playerIds?.forEach((id) => busy.add(id))
  }
  return session.players.filter((p) => !busy.has(p.id))
}

/** Waiting players eligible to be picked for the next game — excludes anyone paused. */
function getEligiblePool(session: Session, courtNumber: number): SessionPlayer[] {
  return getWaitingPool(session, courtNumber).filter((p) => !p.paused)
}

export function canFillCourt(session: Session, courtNumber: number): boolean {
  return getEligiblePool(session, courtNumber).length >= PLAYERS_PER_COURT
}

/** Lower is better: penalizes repeat partners and an all-one-level group. */
function scoreGroup(group: SessionPlayer[]): number {
  let score = 0
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (group[i].partnerHistory.includes(group[j].id)) score += 10
    }
  }
  if (new Set(group.map((p) => p.level)).size === 1) score += 3
  return score
}

/**
 * Picks the next 4 players for a court from whoever is waiting, prioritizing
 * fairness (fewest games played, then longest since they last played) above
 * all else. Only among players *tied* on that fairness ranking does it pick
 * the specific combination that best mixes skill levels and avoids repeat
 * partners.
 */
export function pickNextGroupForCourt(session: Session, courtNumber: number): SessionPlayer[] | null {
  const waiting = getEligiblePool(session, courtNumber)
  if (waiting.length < PLAYERS_PER_COURT) return null

  const byFairness = [...waiting].sort(
    (a, b) => a.gamesPlayed - b.gamesPlayed || a.lastPlayedSeq - b.lastPlayedSeq || Math.random() - 0.5,
  )
  if (byFairness.length === PLAYERS_PER_COURT) return byFairness

  const cutoffGames = byFairness[PLAYERS_PER_COURT - 1].gamesPlayed
  const mustPlay = byFairness.filter((p) => p.gamesPlayed < cutoffGames)
  const tiedAtCutoff = byFairness.filter((p) => p.gamesPlayed === cutoffGames)
  const slotsRemaining = PLAYERS_PER_COURT - mustPlay.length

  let best = [...mustPlay, ...tiedAtCutoff.slice(0, slotsRemaining)]
  let bestScore = scoreGroup(best)
  for (let attempt = 0; attempt < VARIETY_ATTEMPTS && bestScore > 0; attempt++) {
    const candidate = [...mustPlay, ...shuffle(tiedAtCutoff).slice(0, slotsRemaining)]
    const score = scoreGroup(candidate)
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

function applyCourtAssignment(session: Session, courtNumber: number, group: SessionPlayer[]): Session {
  const seq = session.turnCounter + 1
  const groupIds = new Set(group.map((p) => p.id))
  const partnersById = new Map(group.map((p) => [p.id, group.filter((o) => o.id !== p.id).map((o) => o.id)]))

  const players = session.players.map((p) => {
    if (!groupIds.has(p.id)) return p
    return {
      ...p,
      gamesPlayed: p.gamesPlayed + 1,
      lastPlayedSeq: seq,
      partnerHistory: [...p.partnerHistory, ...(partnersById.get(p.id) ?? [])],
    }
  })

  const courts = session.courts.map((c) =>
    c.courtNumber === courtNumber
      ? { ...c, playerIds: group.map((p) => p.id), gamesOnCourt: c.gamesOnCourt + 1 }
      : c,
  )

  return { ...session, players, courts, turnCounter: seq }
}

/** Starts the next game on one specific court. No-op if not enough players are waiting. */
export function fillCourt(session: Session, courtNumber: number): Session {
  const group = pickNextGroupForCourt(session, courtNumber)
  if (!group) return session
  return applyCourtAssignment(session, courtNumber, group)
}

/** Fills every court that doesn't have a game running yet, one at a time so
 * each court's picks affect the waiting pool for the next. */
export function fillAllEmptyCourts(session: Session): Session {
  let next = session
  for (const court of session.courts) {
    if (!court.playerIds) next = fillCourt(next, court.courtNumber)
  }
  return next
}

/** Adds a player who's arriving mid-session. They start at 0 games played, which
 * puts them first in line for the next court that opens up. No-op if already in. */
export function addPlayerToSession(session: Session, player: Player): Session {
  if (session.players.some((p) => p.id === player.id)) return session
  const newPlayer: SessionPlayer = {
    ...player,
    gamesPlayed: 0,
    lastPlayedSeq: session.turnCounter,
    partnerHistory: [],
    paused: false,
    foodOrders: [],
  }
  return { ...session, players: [...session.players, newPlayer] }
}

/** Pauses or resumes a waiting player so matchmaking skips (or considers) them.
 * No-op if the player is currently on a court — they need to finish that game first. */
export function setPlayerPaused(session: Session, playerId: string, paused: boolean): Session {
  const isPlaying = session.courts.some((c) => c.playerIds?.includes(playerId))
  if (isPlaying) return session
  return {
    ...session,
    players: session.players.map((p) => (p.id === playerId ? { ...p, paused } : p)),
  }
}

/** Records food/drinks a specific player ordered, billed to them alone. */
export function addFoodOrder(session: Session, playerId: string, description: string, amount: number): Session {
  return {
    ...session,
    players: session.players.map((p) =>
      p.id === playerId
        ? { ...p, foodOrders: [...p.foodOrders, { id: generateId(), description, amount }] }
        : p,
    ),
  }
}

export function removeFoodOrder(session: Session, playerId: string, orderId: string): Session {
  return {
    ...session,
    players: session.players.map((p) =>
      p.id === playerId ? { ...p, foodOrders: p.foodOrders.filter((o) => o.id !== orderId) } : p,
    ),
  }
}

export function createSession(
  selected: Player[],
  numCourts: number,
  durationMinutes: number,
  courtRentalTotal: number,
  entranceFeePerPerson: number,
): Session {
  const session: Session = {
    numCourts,
    durationMinutes,
    startedAt: Date.now(),
    endedAt: null,
    turnCounter: 0,
    players: selected.map((p) => ({
      ...p,
      gamesPlayed: 0,
      lastPlayedSeq: 0,
      partnerHistory: [],
      paused: false,
      foodOrders: [],
    })),
    courts: Array.from({ length: numCourts }, (_, i) => ({
      courtNumber: i + 1,
      label: `Court ${i + 1}`,
      playerIds: null,
      gamesOnCourt: 0,
    })),
    courtRentalTotal,
    entranceFeePerPerson,
  }
  return fillAllEmptyCourts(session)
}

/** Renames a court's display label — e.g. to match whatever physical court number a rented venue assigned. */
export function renameCourt(session: Session, courtNumber: number, label: string): Session {
  const trimmed = label.trim()
  if (!trimmed) return session
  return {
    ...session,
    courts: session.courts.map((c) => (c.courtNumber === courtNumber ? { ...c, label: trimmed } : c)),
  }
}

/** Marks the session ended — data stays so the summary can render, but no more games start. */
export function endSession(session: Session): Session {
  return { ...session, endedAt: Date.now() }
}
