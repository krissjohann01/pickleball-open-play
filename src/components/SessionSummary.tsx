import { useMemo } from 'react'
import type { Session } from '../types'
import { formatDuration } from '../format'
import CostSplit from './CostSplit'
import FoodOrders from './FoodOrders'
import PlayerBadge from './PlayerBadge'

export default function SessionSummary({
  session,
  isAdmin,
  onDone,
  onAddFoodOrder,
  onRemoveFoodOrder,
  onSaveSummary,
  saveStatus,
}: {
  session: Session
  isAdmin: boolean
  onDone: () => void
  onAddFoodOrder: (playerId: string, description: string, amount: number) => void
  onRemoveFoodOrder: (playerId: string, orderId: string) => void
  onSaveSummary: () => void
  saveStatus: string | null
}) {
  const totalGames = session.courts.reduce((sum, c) => sum + c.gamesOnCourt, 0)
  const elapsedSeconds = ((session.endedAt ?? Date.now()) - session.startedAt) / 1000

  const leaderboard = useMemo(
    () =>
      [...session.players].sort(
        (a, b) => b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name),
      ),
    [session.players],
  )

  const gamesPlayedValues = session.players.map((p) => p.gamesPlayed)
  const minGames = gamesPlayedValues.length ? Math.min(...gamesPlayedValues) : 0
  const maxGames = gamesPlayedValues.length ? Math.max(...gamesPlayedValues) : 0
  const spread = maxGames - minGames

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Session Summary</h1>
      <p className="mb-6 text-sm text-slate-500">
        {session.players.length} players · {formatDuration(elapsedSeconds)} played
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{totalGames}</div>
          <div className="text-xs text-slate-500">Games played</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{session.numCourts}</div>
          <div className="text-xs text-slate-500">Courts used</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {minGames}–{maxGames}
          </div>
          <div className="text-xs text-slate-500">Games per player</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{spread}</div>
          <div className="text-xs text-slate-500">Fairness spread</div>
        </div>
      </div>

      <CostSplit
        courtRentalTotal={session.courtRentalTotal}
        entranceFeePerPerson={session.entranceFeePerPerson}
        players={session.players}
      />

      <FoodOrders
        players={session.players}
        isAdmin={isAdmin}
        onAddOrder={onAddFoodOrder}
        onRemoveOrder={onRemoveFoodOrder}
      />

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Games Played Per Court
      </h2>
      <ul className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {session.courts.map((c) => (
          <li
            key={c.courtNumber}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {c.label}: <span className="font-medium">{c.gamesOnCourt}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Games Played Per Player
      </h2>
      <ul className="mb-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onSaveSummary}
          disabled={!isAdmin}
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Summary
        </button>
        <button
          onClick={onDone}
          disabled={!isAdmin}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to Roster
        </button>
      </div>
      {!isAdmin && <p className="mt-2 text-sm text-slate-400">Admin login required to save or dismiss this summary.</p>}
      {saveStatus && <p className="mt-2 text-sm text-slate-500">{saveStatus}</p>}
    </div>
  )
}
