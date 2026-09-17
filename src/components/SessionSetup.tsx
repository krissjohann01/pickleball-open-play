import { useState } from 'react'
import type { Player } from '../types'
import PlayerBadge from './PlayerBadge'

export default function SessionSetup({
  roster,
  onBack,
  onStart,
}: {
  roster: Player[]
  onBack: () => void
  onStart: (
    selected: Player[],
    numCourts: number,
    durationMinutes: number,
    courtRentalTotal: number,
    entranceFeePerPerson: number,
  ) => void
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(roster.map((p) => p.id)))
  const [numCourts, setNumCourts] = useState(2)
  const [durationMinutes, setDurationMinutes] = useState(180)
  const [courtRentalTotal, setCourtRentalTotal] = useState(0)
  const [entranceFeePerPerson, setEntranceFeePerPerson] = useState(0)

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedCount = selectedIds.size
  const canStart = selectedCount >= 4 && numCourts >= 1 && durationMinutes >= 1
  const estimatedPerPerson = selectedCount > 0 ? courtRentalTotal / selectedCount + entranceFeePerPerson : 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700">
        ← Back to roster
      </button>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Today&apos;s Session</h1>

      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Courts available
          <input
            type="number"
            min={1}
            value={numCourts}
            onChange={(e) => setNumCourts(Math.max(1, Number(e.target.value)))}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Session length (minutes)
          <input
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Court rental (total)
          <input
            type="number"
            min={0}
            step="0.01"
            value={courtRentalTotal}
            onChange={(e) => setCourtRentalTotal(Math.max(0, Number(e.target.value)))}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Entrance fee (per person)
          <input
            type="number"
            min={0}
            step="0.01"
            value={entranceFeePerPerson}
            onChange={(e) => setEntranceFeePerPerson(Math.max(0, Number(e.target.value)))}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {(courtRentalTotal > 0 || entranceFeePerPerson > 0) && (
        <p className="mb-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ≈ {estimatedPerPerson.toFixed(2)} per person if all {selectedCount} selected players get on
          a court. The actual split during the session only counts players who&apos;ve played at least
          one game.
        </p>
      )}

      <h2 className="mb-2 text-sm font-semibold text-slate-700">
        Who&apos;s attending? ({selectedCount} selected)
      </h2>
      <ul className="mb-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {roster.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={selectedIds.has(p.id)}
              onChange={() => toggle(p.id)}
              className="h-4 w-4"
            />
            <span className="flex-1 font-medium text-slate-900">{p.name}</span>
            <PlayerBadge level={p.level} />
          </li>
        ))}
      </ul>

      <button
        onClick={() =>
          onStart(
            roster.filter((p) => selectedIds.has(p.id)),
            numCourts,
            durationMinutes,
            courtRentalTotal,
            entranceFeePerPerson,
          )
        }
        disabled={!canStart}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Start Session
      </button>
      {selectedCount < 4 && (
        <p className="mt-2 text-sm text-red-500">Select at least 4 players.</p>
      )}
    </div>
  )
}
