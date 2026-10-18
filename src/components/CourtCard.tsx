import { useState } from 'react'
import type { CourtSlot, SessionPlayer } from '../types'
import { PLAYERS_PER_COURT } from '../matchmaking'
import PlayerBadge from './PlayerBadge'

export default function CourtCard({
  court,
  players,
  isAdmin,
  canFill,
  canUndo,
  canRemove,
  onNextGame,
  onUndo,
  choosablePlayers,
  onRepick,
  onRepickWith,
  onRename,
  onRemove,
}: {
  court: CourtSlot
  players: Map<string, SessionPlayer>
  isAdmin: boolean
  canFill: boolean
  canUndo: boolean
  canRemove: boolean
  onNextGame: () => void
  onUndo: () => void
  choosablePlayers: SessionPlayer[]
  onRepick: () => void
  onRepickWith: (playerIds: string[]) => void
  onRename: (label: string) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(court.label)
  const [choosing, setChoosing] = useState(false)
  const [chosenIds, setChosenIds] = useState<string[]>([])

  function startChoosing() {
    setChosenIds(court.playerIds ?? [])
    setChoosing(true)
  }

  function toggleChosen(id: string) {
    setChosenIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < PLAYERS_PER_COURT ? [...ids, id] : ids,
    )
  }

  function confirmChoice() {
    onRepickWith(chosenIds)
    setChoosing(false)
  }

  const choosableByFairness = [...choosablePlayers].sort(
    (a, b) => a.gamesPlayed - b.gamesPlayed || a.lastPlayedSeq - b.lastPlayedSeq || a.name.localeCompare(b.name),
  )

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
        <p className="mb-3 text-sm text-slate-400">{court.gamesOnCourt > 0 ? 'Open — ready for the next game.' : 'Not started yet.'}</p>
      )}

      <button
        onClick={onNextGame}
        disabled={!isAdmin || !canFill}
        className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {court.playerIds ? 'Next Game' : 'Start Game'}
      </button>
      {isAdmin && canUndo && choosing && court.playerIds && (
        <div className="mt-2 rounded-lg border border-slate-200 p-2">
          <p className="mb-1 text-xs text-slate-500">
            Choose {PLAYERS_PER_COURT} players ({chosenIds.length}/{PLAYERS_PER_COURT})
          </p>
          <ul className="mb-2 max-h-56 space-y-1 overflow-y-auto">
            {choosableByFairness.map((p) => {
              const checked = chosenIds.includes(p.id)
              const disabled = !checked && chosenIds.length >= PLAYERS_PER_COURT
              return (
                <li key={p.id}>
                  <label
                    className={`flex items-center gap-2 rounded px-1 py-0.5 text-sm ${
                      disabled ? 'text-slate-300' : 'cursor-pointer text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleChosen(p.id)}
                    />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs text-slate-400">
                      {/* Current players' counts already include this game — show the count they'd have before it. */}
                      {court.playerIds?.includes(p.id) ? p.gamesPlayed - 1 : p.gamesPlayed}g
                    </span>
                    <PlayerBadge level={p.level} />
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={confirmChoice}
              disabled={chosenIds.length !== PLAYERS_PER_COURT}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Put on court
            </button>
            <button
              onClick={() => setChoosing(false)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {isAdmin && canUndo && !choosing && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onUndo}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            title="Send these players back to the waiting list as if they never played"
          >
            Undo
          </button>
          {court.playerIds && (
            <button
              onClick={onRepick}
              className="flex-1 rounded-lg border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              title="Discard this pick and choose a different group"
            >
              Re-pick
            </button>
          )}
          {court.playerIds && (
            <button
              onClick={startChoosing}
              className="flex-1 rounded-lg border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              title="Discard this pick and choose the players yourself"
            >
              Choose
            </button>
          )}
        </div>
      )}
      {!isAdmin ? (
        <p className="mt-1 text-center text-xs text-slate-400">Admin login required</p>
      ) : (
        !canFill && <p className="mt-1 text-center text-xs text-slate-400">Waiting for more players</p>
      )}
    </div>
  )
}
