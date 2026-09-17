import { useState } from 'react'
import type { CourtSlot, SessionPlayer } from '../types'
import PlayerBadge from './PlayerBadge'

export default function CourtCard({
  court,
  players,
  isAdmin,
  canFill,
  canRemove,
  onNextGame,
  onRename,
  onRemove,
}: {
  court: CourtSlot
  players: Map<string, SessionPlayer>
  isAdmin: boolean
  canFill: boolean
  canRemove: boolean
  onNextGame: () => void
  onRename: (label: string) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(court.label)

  function startEditing() {
    setDraft(court.label)
    setEditing(true)
  }

  function save() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== court.label) onRename(trimmed)
    setEditing(false)
  }

  function handleRemove() {
    const message = court.playerIds
      ? `${court.label} has a game in progress. Remove it anyway? Those players will rejoin the waiting list.`
      : `Remove ${court.label}?`
    if (window.confirm(message)) onRemove()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="mb-3 flex items-center gap-1"
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(false)
            }}
            maxLength={40}
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-slate-700"
          />
        </form>
      ) : (
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {court.label}
          {court.gamesOnCourt > 0 && (
            <span className="font-normal normal-case text-slate-400">· Game {court.gamesOnCourt}</span>
          )}
          {isAdmin && (
            <span className="ml-auto flex items-center gap-2">
              <button
                onClick={startEditing}
                className="text-xs font-normal normal-case text-slate-400 hover:text-slate-600"
                title="Rename this court"
                aria-label={`Rename ${court.label}`}
              >
                Rename
              </button>
              {canRemove && (
                <button
                  onClick={handleRemove}
                  className="text-xs font-normal normal-case text-red-400 hover:text-red-600"
                  title="Remove this court"
                  aria-label={`Remove ${court.label}`}
                >
                  Remove
                </button>
              )}
            </span>
          )}
        </h3>
      )}

      {court.playerIds ? (
        <ul className="mb-3 space-y-2">
          {court.playerIds.map((id) => {
            const player = players.get(id)
            if (!player) return null
            return (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">{player.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {player.gamesPlayed} {player.gamesPlayed === 1 ? 'game' : 'games'}
                  </span>
                  <PlayerBadge level={player.level} />
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-slate-400">Not started yet.</p>
      )}

      <button
        onClick={onNextGame}
        disabled={!isAdmin || !canFill}
        className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {court.playerIds ? 'Next Game' : 'Start Game'}
      </button>
      {!isAdmin ? (
        <p className="mt-1 text-center text-xs text-slate-400">Admin login required</p>
      ) : (
        !canFill && <p className="mt-1 text-center text-xs text-slate-400">Waiting for more players</p>
      )}
    </div>
  )
}
