import type { Player, Session, SessionPlayer } from './types'
import { generateId } from './id'

export const PLAYERS_PER_COURT = 4
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
export function getEligiblePool(session: Session, courtNumber: number): SessionPlayer[] {
  return getWaitingPool(session, courtNumber).filter((p) => !p.paused)
}

export function canFillCourt(session: Session, courtNumber: number): boolean {
  return getEligiblePool(session, courtNumber).length >= PLAYERS_PER_COURT
}

function isSameGroup(group: SessionPlayer[], ids: Set<string>): boolean {
  return group.length === ids.size && group.every((p) => ids.has(p.id))
}

/** Lower is better: penalizes repeat partners and an all-one-level group, and
 * heavily penalizes repeating the exact group being re-picked (`avoid`). */
function scoreGroup(group: SessionPlayer[], avoid?: Set<string>): number {
  let score = avoid && isSameGroup(group, avoid) ? 1000 : 0
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
 * partners. `avoid` (when re-picking) steers away from that exact group if the
 * fairness ranking leaves any alternative.
 */
export function pickNextGroupForCourt(
  session: Session,
  courtNumber: number,
  avoid?: Set<string>,
): SessionPlayer[] | null {
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
  let bestScore = scoreGroup(best, avoid)
  for (let attempt = 0; attempt < VARIETY_ATTEMPTS && bestScore > 0; attempt++) {
    const candidate = [...mustPlay, ...shuffle(tiedAtCutoff).slice(0, slotsRemaining)]
    const score = scoreGroup(candidate, avoid)
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

function applyCourtAssignment(session: Session, courtNumber: number, group: SessionPlayer[]): Session {
  const seq = session.turnCounter + 1
  const court = session.courts.find((c) => c.courtNumber === courtNumber)
  const undo = {
    previousPlayerIds: court?.playerIds ?? null,
    playerStats: group.map(({ id, gamesPlayed, lastPlayedSeq, partnerHistory }) => ({
      id,
      gamesPlayed,
      lastPlayedSeq,
      partnerHistory,
    })),
  }
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
      ? { ...c, playerIds: group.map((p) => p.id), gamesOnCourt: c.gamesOnCourt + 1, undo }
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

/** Whether the court's last assignment can be undone — the players it replaced
 * must not have been put on another court since. */
export function canUndoCourt(session: Session, courtNumber: number): boolean {
  const court = session.courts.find((c) => c.courtNumber === courtNumber)
  if (!court?.undo) return false
  const busyElsewhere = new Set(
    session.courts.filter((c) => c.courtNumber !== courtNumber).flatMap((c) => c.playerIds ?? []),
  )
  return !(court.undo.previousPlayerIds ?? []).some((id) => busyElsewhere.has(id))
}

/** Reverts a court's last assignment: the previous group goes back on the court
 * and the assigned group's game counts and partner history are rolled back. */
export function undoCourt(session: Session, courtNumber: number): Session {
  if (!canUndoCourt(session, courtNumber)) return session
  const court = session.courts.find((c) => c.courtNumber === courtNumber)!
  const { previousPlayerIds, playerStats } = court.undo!
  const statsById = new Map(playerStats.map((s) => [s.id, s]))
  const restoredIds = new Set(previousPlayerIds ?? [])

  const players = session.players.map((p) => {
    const stats = statsById.get(p.id)
    if (stats) return { ...p, ...stats }
    // Anyone paused while waiting can't stay paused once they're back on a court.
    if (restoredIds.has(p.id) && p.paused) return { ...p, paused: false }
    return p
  })
  const courts = session.courts.map((c) =>
    c.courtNumber === courtNumber
      ? { ...c, playerIds: previousPlayerIds, gamesOnCourt: c.gamesOnCourt - 1, undo: null }
      : c,
  )
  return { ...session, players, courts }
}

/** Undoes a court's last assignment and picks a fresh group, preferring a
 * different set of players when fairness allows. Undo afterwards still returns
 * to the state before the original pick. */
export function repickCourt(session: Session, courtNumber: number): Session {
  const court = session.courts.find((c) => c.courtNumber === courtNumber)
  if (!court?.playerIds || !canUndoCourt(session, courtNumber)) return session
  const undone = undoCourt(session, courtNumber)
  const group = pickNextGroupForCourt(undone, courtNumber, new Set(court.playerIds))
  if (!group) return session
  return applyCourtAssignment(undone, courtNumber, group)
}

/** Undoes a court's last assignment and puts the organizer's hand-picked group
 * on instead. No-op unless exactly four distinct, unpaused players are chosen
 * and none of them is on another court. */
export function repickCourtWith(session: Session, courtNumber: number, playerIds: string[]): Session {
  const court = session.courts.find((c) => c.courtNumber === courtNumber)
  if (!court?.playerIds || !canUndoCourt(session, courtNumber)) return session
  if (new Set(playerIds).size !== PLAYERS_PER_COURT || playerIds.length !== PLAYERS_PER_COURT) return session
  const undone = undoCourt(session, courtNumber)
  const eligibleById = new Map(getEligiblePool(undone, courtNumber).map((p) => [p.id, p]))
  const group = playerIds.map((id) => eligibleById.get(id))
  if (group.some((p) => !p)) return session
  return applyCourtAssignment(undone, courtNumber, group as SessionPlayer[])
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

/** Extends the session's total duration — e.g. the venue lets the group stay longer. */
export function extendSession(session: Session, additionalMinutes: number): Session {
  if (additionalMinutes <= 0) return session
  return { ...session, durationMinutes: session.durationMinutes + additionalMinutes }
}

/** Adds one more court mid-session (e.g. a rented court frees up). Starts empty —
 * the admin fills it with "Start Game" like any newly opened court. */
export function addCourt(session: Session): Session {
  const nextCourtNumber =
    session.courts.length > 0 ? Math.max(...session.courts.map((c) => c.courtNumber)) + 1 : 1
  const newCourt = { courtNumber: nextCourtNumber, label: `Court ${nextCourtNumber}`, playerIds: null, gamesOnCourt: 0 }
  return { ...session, numCourts: session.numCourts + 1, courts: [...session.courts, newCourt] }
}

/** Removes a specific court mid-session (e.g. a rented court is no longer available).
 * Anyone currently playing on it simply rejoins the waiting pool. Always keeps at least one court. */
export function removeCourt(session: Session, courtNumber: number): Session {
  if (session.courts.length <= 1) return session
  return {
    ...session,
    numCourts: session.numCourts - 1,
    courts: session.courts.filter((c) => c.courtNumber !== courtNumber),
  }
}

/** Updates the shared costs for the session — e.g. after adding a court or extending
 * the time changes what the venue charges. */
export function updateSessionCost(session: Session, courtRentalTotal: number, entranceFeePerPerson: number): Session {
  return { ...session, courtRentalTotal, entranceFeePerPerson }
}

/** Marks the session ended — data stays so the summary can render, but no more games start. */
export function endSession(session: Session): Session {
  return { ...session, endedAt: Date.now() }
}
