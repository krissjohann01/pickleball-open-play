import { useState } from 'react'
import type { Player, SkillLevel } from '../types'
import { SKILL_LEVELS } from '../skillLevels'

export default function AddLatePlayer({
  rosterCandidates,
  onAddExisting,
  onAddNew,
}: {
  /** Roster players not already in this session. */
  rosterCandidates: Player[]
  onAddExisting: (player: Player) => void
  onAddNew: (player: Player) => void
}) {
  const [selectedRosterId, setSelectedRosterId] = useState('')
  const [newName, setNewName] = useState('')
  const [newLevel, setNewLevel] = useState<SkillLevel>(SKILL_LEVELS[0].value)

  function addExisting(e: React.FormEvent) {
    e.preventDefault()
    const player = rosterCandidates.find((p) => p.id === selectedRosterId)
    if (!player) return
    onAddExisting(player)
    setSelectedRosterId('')
  }

  function addNew(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddNew({ id: crypto.randomUUID(), name: trimmed, level: newLevel })
    setNewName('')
    setNewLevel(SKILL_LEVELS[0].value)
  }

  return (
    <details className="mb-8 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-700">
        + Add a player who just arrived
      </summary>
      <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        {rosterCandidates.length > 0 && (
          <form onSubmit={addExisting} className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRosterId}
              onChange={(e) => setSelectedRosterId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">From roster…</option>
              {rosterCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedRosterId}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add
            </button>
          </form>
        )}

        <form onSubmit={addNew} className="flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New player name"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value as SkillLevel)}
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
            Add New
          </button>
        </form>
      </div>
    </details>
  )
}
