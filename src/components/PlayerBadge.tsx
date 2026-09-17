import type { SkillLevel } from '../types'
import { getSkillLevelInfo } from '../skillLevels'

export default function PlayerBadge({ level }: { level: SkillLevel }) {
  const info = getSkillLevelInfo(level)
  return (
    <span
      title={`${info.name} (${info.ratingLabel})`}
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.badgeClass}`}
    >
      {info.ratingLabel}
    </span>
  )
}
