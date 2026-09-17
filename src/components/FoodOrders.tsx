import { useState } from 'react'
import type { SessionPlayer } from '../types'

export default function FoodOrders({
  players,
  onAddOrder,
  onRemoveOrder,
}: {
  players: SessionPlayer[]
  onAddOrder: (playerId: string, description: string, amount: number) => void
  onRemoveOrder: (playerId: string, orderId: string) => void
}) {
  const [playerId, setPlayerId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const playersWithOrders = players.filter((p) => p.foodOrders.length > 0)

  function addOrder(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = Number(amount)
    if (!playerId || !parsedAmount || parsedAmount <= 0) return
    onAddOrder(playerId, description.trim() || 'Food/drinks', parsedAmount)
    setDescription('')
    setAmount('')
  }

  return (
    <details className="mb-8 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-700">
        🍔 Food / extra charges
      </summary>
      <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        <form onSubmit={addOrder} className="flex flex-wrap items-center gap-2">
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Who ordered?</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What (optional)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min={0}
            step="0.01"
            placeholder="Amount"
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!playerId || !amount}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add
          </button>
        </form>

        {playersWithOrders.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {playersWithOrders.map((p) => {
              const total = p.foodOrders.reduce((sum, o) => sum + o.amount, 0)
              return (
                <li key={p.id} className="px-3 py-2">
                  <div className="mb-1 flex items-center justify-between text-sm font-medium text-slate-900">
                    <span>{p.name}</span>
                    <span>{total.toFixed(2)}</span>
                  </div>
                  <ul className="space-y-1">
                    {p.foodOrders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between text-xs text-slate-500">
                        <span>{o.description}</span>
                        <span className="flex items-center gap-2">
                          {o.amount.toFixed(2)}
                          <button
                            onClick={() => onRemoveOrder(p.id, o.id)}
                            className="text-red-500 hover:text-red-700"
                            aria-label={`Remove ${o.description} for ${p.name}`}
                          >
                            ✕
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}
