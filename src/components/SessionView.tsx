import { useEffect, useMemo, useState } from 'react'
import type { Player, Session } from '../types'
import { canFillCourt } from '../matchmaking'
import { formatDuration } from '../format'
import AddLatePlayer from './AddLatePlayer'
import CostSplit from './CostSplit'
import CourtCard from './CourtCard'
import FoodOrders from './FoodOrders'
import PlayerBadge from './PlayerBadge'

export default function SessionView({
  session,
  roster,
  isAdmin,
  onNextGame,
  onAddExistingPlayer,
  onAddNewPlayer,
  onTogglePause,
  onRenameCourt,
  onExtendSession,
  onAddCourt,
  onRemoveCourt,
  onUpdateSessionCost,
  onAddFoodOrder,
  onRemoveFoodOrder,
  onEndSession,
}: {
  session: Session
  roster: Player[]
  isAdmin: boolean
  onNextGame: (courtNumber: number) => void
  onAddExistingPlayer: (player: Player) => void
  onAddNewPlayer: (player: Player) => void
  onTogglePause: (playerId: string, paused: boolean) => void
  onRenameCourt: (courtNumber: number, label: string) => void
  onExtendSession: (additionalMinutes: number) => void
  onAddCourt: () => void
  onRemoveCourt: (courtNumber: number) => void
  onUpdateSessionCost: (courtRentalTotal: number, entranceFeePerPerson: number) => void
  onAddFoodOrder: (playerId: string, description: string, amount: number) => void
  onRemoveFoodOrder: (playerId: string, orderId: string) => void
  onEndSession: () => void
}) {
  const [now, setNow] = useState(Date.now())
  const [showExtend, setShowExtend] = useState(false)
  const [extendMinutes, setExtendMinutes] = useState('30')

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const playersById = useMemo(() => new Map(session.players.map((p) => [p.id, p])), [session.players])

  const elapsedSeconds = (now - session.startedAt) / 1000
  const remainingSeconds = session.durationMinutes * 60 - elapsedSeconds
  const sessionOver = remainingSeconds <= 0

  const activeWaiting = useMemo(() => {
    const busy = new Set(session.courts.flatMap((c) => c.playerIds ?? []))
    return session.players.filter((p) => !busy.has(p.id) && !p.paused)
  }, [session.players, session.courts])

  const pausedPlayers = useMemo(
    () => session.players.filter((p) => p.paused),
    [session.players],
  )

  const leaderboard = useMemo(
    () => [...session.players].sort((a, b) => a.gamesPlayed - b.gamesPlayed || a.name.localeCompare(b.name)),
    [session.players],
  )

  const rosterCandidates = useMemo(
    () => roster.filter((p) => !session.players.some((sp) => sp.id === p.id)),
    [roster, session.players],
  )

  const [activeTab, setActiveTab] = useState<'players' | 'charges'>('players')

  const hasCharges =
    session.courtRentalTotal > 0 ||
    session.entranceFeePerPerson > 0 ||
    session.players.some((p) => p.foodOrders.length > 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Open Play Session</h1>
          <p className={`font-mono text-sm ${sessionOver ? 'text-red-600' : 'text-slate-500'}`}>
            {sessionOver ? 'Session time is up · ' : 'Time remaining: '}
            {formatDuration(remainingSeconds)}
          </p>
          {isAdmin &&
            (showExtend ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const minutes = Math.max(0, Math.round(Number(extendMinutes) || 0))
                  if (minutes > 0) onExtendSession(minutes)
                  setShowExtend(false)
                }}
                className="mt-1 flex items-center gap-1"
              >
                <input
                  autoFocus
                  type="number"
                  min="1"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowExtend(false)
                  }}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-slate-500">min</span>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Add time
                </button>
                <button
                  type="button"
                  onClick={() => setShowExtend(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowExtend(true)}
                className="mt-1 text-xs font-medium text-emerald-700 hover:underline"
              >
                Extend session
              </button>
            ))}
        </div>
        <button
          onClick={onEndSession}
          disabled={!isAdmin}
          title={isAdmin ? undefined : 'Admin login required'}
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          End Session
        </button>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'players'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Players &amp; Courts
        </button>
        <button
          onClick={() => setActiveTab('charges')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'charges'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Charges {hasCharges && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />}
        </button>
      </div>

      {activeTab === 'players' && (
        <>
          <AddLatePlayer
            rosterCandidates={rosterCandidates}
            isAdmin={isAdmin}
            onAddExisting={onAddExistingPlayer}
            onAddNew={onAddNewPlayer}
          />

          <p className="mb-3 text-sm text-slate-500">
            Tap <span className="font-medium text-slate-700">Next Game</span> on a court as soon as it
            finishes — courts don&apos;t need to wait on each other.
          </p>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {session.courts.map((court) => (
              <CourtCard
                key={court.courtNumber}
                court={court}
                players={playersById}
                isAdmin={isAdmin}
                canFill={canFillCourt(session, court.courtNumber)}
                canRemove={session.courts.length > 1}
                onNextGame={() => onNextGame(court.courtNumber)}
                onRename={(label) => onRenameCourt(court.courtNumber, label)}
                onRemove={() => onRemoveCourt(court.courtNumber)}
              />
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={onAddCourt}
              className="mb-8 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
            >
              + Add Court
            </button>
          )}

          {activeWaiting.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Waiting ({activeWaiting.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {activeWaiting.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5 text-sm text-slate-700"
                  >
                    {p.name}
                    <span className="text-xs text-slate-400">
                      ({p.gamesPlayed} {p.gamesPlayed === 1 ? 'game' : 'games'})
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => onTogglePause(p.id, true)}
                        className="rounded-full px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                        title="Step away — skip until resumed"
                      >
                        Pause
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pausedPlayers.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Paused ({pausedPlayers.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {pausedPlayers.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50 py-1 pl-3 pr-1.5 text-sm text-slate-500"
                  >
                    {p.name}
                    {isAdmin && (
                      <button
                        onClick={() => onTogglePause(p.id, false)}
                        className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Resume
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Games Played
            </h2>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {leaderboard.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    {p.name}
                    <PlayerBadge level={p.level} />
                  </span>
                  <span className="text-slate-500">
                    {p.gamesPlayed} {p.gamesPlayed === 1 ? 'game' : 'games'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {activeTab === 'charges' && (
        <>
          <CostSplit
            courtRentalTotal={session.courtRentalTotal}
            entranceFeePerPerson={session.entranceFeePerPerson}
            players={session.players}
            isAdmin={isAdmin}
            onUpdateCost={onUpdateSessionCost}
          />

          <FoodOrders
            players={session.players}
            isAdmin={isAdmin}
            onAddOrder={onAddFoodOrder}
            onRemoveOrder={onRemoveFoodOrder}
          />
        </>
      )}
    </div>
  )
}
