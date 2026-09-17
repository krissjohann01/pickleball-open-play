export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : ''
  const s = Math.abs(Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = [h, m, sec].map((n) => String(n).padStart(2, '0'))
  return `${sign}${parts.join(':')}`
}
