import { useState } from 'react'
import type { Player, SkillLevel } from '../types'
import { SKILL_LEVELS } from '../skillLevels'
import { generateId } from '../id'
import PlayerBadge from './PlayerBadge'
import SkillLevelLegend from './SkillLevelLegend'

export default function RosterView({
  roster,
  onChange,
  onStartSetup,
}: {
  roster: Player[]
  onChange: (roster: Player[]) => void
  onStartSetup: () => void
}) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState<SkillLevel>(SKILL_LEVELS[0].value)

  function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const player: Player = { id: generateId(), name: trimmed, level }
    onChange([...roster, player])
    setName('')
    setLevel(SKILL_LEVELS[0].value)
  }

  function updateLevel(id: string, newLevel: SkillLevel) {
    onChange(roster.map((p) => (p.id === id ? { ...p, level: newLevel } : p)))
  }

  function removePlayer(id: string) {
    onChange(roster.filter((p) => p.id !== id))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Player Roster</h1>
        <button
          onClick={onStartSetup}
          disabled={roster.length < 4}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Start a Session
        </button>
      </div>

      <SkillLevelLegend />

      <form onSubmit={addPlayer} className="mb-6 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as SkillLevel)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {SKILL_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.ratingLabel} · {l.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add Player
        </button>
      </form>

      {roster.length === 0 ? (
        <p className="text-sm text-slate-500">
          No players yet. Add at least 4 players to start a session.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {roster.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium text-slate-900">{p.name}</span>
              <div className="flex items-center gap-3">
                <select
                  value={p.level}
                  onChange={(e) => updateLevel(p.id, e.target.value as SkillLevel)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  {SKILL_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.ratingLabel} · {l.name}
                    </option>
                  ))}
                </select>
                <PlayerBadge level={p.level} />
                <button
                  onClick={() => removePlayer(p.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                  aria-label={`Remove ${p.name}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
