import type { CourtSlot, SessionPlayer } from '../types'
import PlayerBadge from './PlayerBadge'

export default function CourtCard({
  court,
  players,
  canFill,
  onNextGame,
}: {
  court: CourtSlot
  players: Map<string, SessionPlayer>
  canFill: boolean
  onNextGame: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Court {court.courtNumber}
        {court.gamesOnCourt > 0 && (
          <span className="ml-1 font-normal normal-case text-slate-400">· Game {court.gamesOnCourt}</span>
        )}
      </h3>

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
        disabled={!canFill}
        className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {court.playerIds ? 'Next Game' : 'Start Game'}
      </button>
      {!canFill && <p className="mt-1 text-center text-xs text-slate-400">Waiting for more players</p>}
    </div>
  )
}
