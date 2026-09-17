import { useState } from 'react'
import type { SessionPlayer } from '../types'

export default function CostSplit({
  courtRentalTotal,
  entranceFeePerPerson,
  players,
  isAdmin,
  onUpdateCost,
}: {
  courtRentalTotal: number
  entranceFeePerPerson: number
  players: SessionPlayer[]
  isAdmin: boolean
  onUpdateCost: (courtRentalTotal: number, entranceFeePerPerson: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [rentalDraft, setRentalDraft] = useState(String(courtRentalTotal))
  const [entranceDraft, setEntranceDraft] = useState(String(entranceFeePerPerson))

  function startEditing() {
    setRentalDraft(String(courtRentalTotal))
    setEntranceDraft(String(entranceFeePerPerson))
    setEditing(true)
  }

  function save() {
    const rental = Math.max(0, Number(rentalDraft) || 0)
    const entrance = Math.max(0, Number(entranceDraft) || 0)
    onUpdateCost(rental, entrance)
    setEditing(false)
  }

  const anyFoodOrders = players.some((p) => p.foodOrders.length > 0)

  if (!isAdmin && courtRentalTotal <= 0 && entranceFeePerPerson <= 0 && !anyFoodOrders) return null

  if (editing) {
    return (
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Edit Costs</h2>
        <p className="mb-3 text-xs text-slate-500">
          Update the total if it changed — e.g. after adding a court or extending the time.
        </p>
        <div className="mb-3 flex flex-wrap gap-4">
          <label className="text-sm text-slate-700">
            Court rental total
            <input
              type="number"
              min="0"
              step="0.01"
              value={rentalDraft}
              onChange={(e) => setRentalDraft(e.target.value)}
              className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-1.5"
            />
          </label>
          <label className="text-sm text-slate-700">
            Entrance fee per person
            <input
              type="number"
              min="0"
              step="0.01"
              value={entranceDraft}
              onChange={(e) => setEntranceDraft(e.target.value)}
              className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-1.5"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const playedCount = players.filter((p) => p.gamesPlayed > 0).length

  if (playedCount === 0 && !anyFoodOrders) {
    return (
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cost Split</h2>
          {isAdmin && (
            <button onClick={startEditing} className="text-xs font-medium text-emerald-700 hover:underline">
              Edit costs
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">Splits once players start their first game.</p>
      </div>
    )
  }

  const rentalShare = playedCount > 0 ? courtRentalTotal / playedCount : 0
  const baseShare = rentalShare + entranceFeePerPerson

  const rows = players
    .map((p) => {
      const base = p.gamesPlayed > 0 ? baseShare : 0
      const food = p.foodOrders.reduce((sum, o) => sum + o.amount, 0)
      return { player: p, base, food, total: base + food }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name))

  const totalCollected = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cost Split</h2>
          {isAdmin && (
            <button onClick={startEditing} className="text-xs font-medium text-emerald-700 hover:underline">
              Edit costs
            </button>
          )}
        </div>
        <div className="text-right text-sm text-slate-500">
          Total collected
          <span className="ml-2 text-base font-semibold text-slate-900">{totalCollected.toFixed(2)}</span>
        </div>
      </div>

      {!anyFoodOrders ? (
        <div>
          <div className="text-2xl font-bold text-slate-900">{baseShare.toFixed(2)} / person</div>
          <div className="text-xs text-slate-500">
            {courtRentalTotal.toFixed(2)} rental ÷ {playedCount} {playedCount === 1 ? 'player' : 'players'} who
            played ({rentalShare.toFixed(2)} each)
            {entranceFeePerPerson > 0 && ` + ${entranceFeePerPerson.toFixed(2)} entrance fee`}
          </div>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {courtRentalTotal.toFixed(2)} rental ÷ {playedCount} {playedCount === 1 ? 'player' : 'players'} who
            played ({rentalShare.toFixed(2)} each)
            {entranceFeePerPerson > 0 && ` + ${entranceFeePerPerson.toFixed(2)} entrance fee`} + any food ordered
          </p>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {rows.map(({ player, base, food, total }) => (
              <li key={player.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">{player.name}</span>
                <span className="text-slate-500">
                  {base.toFixed(2)}
                  {food > 0 && ` + ${food.toFixed(2)} food`} ={' '}
                  <span className="font-semibold text-slate-900">{total.toFixed(2)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
