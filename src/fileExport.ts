import type { Session } from './types'
import { getSkillLevelInfo } from './skillLevels'
import { formatDuration } from './format'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatFileTimestamp(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

export function summaryFilename(session: Session): string {
  return `session-${formatFileTimestamp(session.startedAt)}.md`
}

export function buildSummaryMarkdown(session: Session): string {
  const totalGames = session.courts.reduce((sum, c) => sum + c.gamesOnCourt, 0)
  const elapsedSeconds = ((session.endedAt ?? Date.now()) - session.startedAt) / 1000
  const gamesPlayedValues = session.players.map((p) => p.gamesPlayed)
  const minGames = gamesPlayedValues.length ? Math.min(...gamesPlayedValues) : 0
  const maxGames = gamesPlayedValues.length ? Math.max(...gamesPlayedValues) : 0

  const leaderboard = [...session.players].sort(
    (a, b) => b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name),
  )

  const playedCount = session.players.filter((p) => p.gamesPlayed > 0).length
  const rentalShare = playedCount > 0 ? session.courtRentalTotal / playedCount : 0
  const baseShare = rentalShare + session.entranceFeePerPerson
  const anyFoodOrders = session.players.some((p) => p.foodOrders.length > 0)

  const costRows = session.players
    .map((p) => {
      const base = p.gamesPlayed > 0 ? baseShare : 0
      const food = p.foodOrders.reduce((sum, o) => sum + o.amount, 0)
      return { player: p, base, food, total: base + food }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name))

  const lines: string[] = []
  lines.push(`# Pickleball Session Summary`)
  lines.push('')
  lines.push(`- **Date:** ${new Date(session.startedAt).toLocaleString()}`)
  lines.push(`- **Duration played:** ${formatDuration(elapsedSeconds)}`)
  lines.push(`- **Players:** ${session.players.length}`)
  lines.push(`- **Courts used:** ${session.numCourts}`)
  lines.push(`- **Total games played:** ${totalGames}`)
  lines.push(`- **Games per player:** ${minGames}–${maxGames} (fairness spread: ${maxGames - minGames})`)
  lines.push('')

  if (session.courtRentalTotal > 0 || session.entranceFeePerPerson > 0 || anyFoodOrders) {
    lines.push(`## Cost Split`)
    lines.push('')
    if (costRows.length > 0) {
      if (!anyFoodOrders) {
        lines.push(
          `${session.courtRentalTotal.toFixed(2)} rental ÷ ${playedCount} players who played ` +
            `(${rentalShare.toFixed(2)} each)` +
            (session.entranceFeePerPerson > 0 ? ` + ${session.entranceFeePerPerson.toFixed(2)} entrance fee` : '') +
            ` = **${baseShare.toFixed(2)} per person**`,
        )
      } else {
        lines.push(`| Player | Court Share | Food | Total |`)
        lines.push(`| --- | --- | --- | --- |`)
        for (const row of costRows) {
          lines.push(
            `| ${row.player.name} | ${row.base.toFixed(2)} | ${row.food.toFixed(2)} | **${row.total.toFixed(2)}** |`,
          )
        }
      }
      lines.push('')
      const totalCollected = costRows.reduce((sum, r) => sum + r.total, 0)
      lines.push(`Total collected: ${totalCollected.toFixed(2)}`)
    } else {
      lines.push('No games were played, so no cost was split.')
    }
    lines.push('')
  }

  lines.push(`## Games Played Per Court`)
  lines.push('')
  for (const c of session.courts) {
    lines.push(`- Court ${c.courtNumber}: ${c.gamesOnCourt}`)
  }
  lines.push('')

  lines.push(`## Games Played Per Player`)
  lines.push('')
  lines.push(`| Player | Level | Games Played |`)
  lines.push(`| --- | --- | --- |`)
  for (const p of leaderboard) {
    lines.push(`| ${p.name} | ${getSkillLevelInfo(p.level).name} (${getSkillLevelInfo(p.level).ratingLabel}) | ${p.gamesPlayed} |`)
  }
  lines.push('')

  return lines.join('\n')
}
