import { SKILL_LEVELS } from '../skillLevels'

export default function SkillLevelLegend() {
  return (
    <details className="mb-6 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-700">
        Skill level guide — not sure what to pick?
      </summary>
      <ul className="divide-y divide-slate-200 border-t border-slate-200">
        {SKILL_LEVELS.map((l) => (
          <li key={l.value} className="flex gap-3 px-4 py-2.5 text-sm">
            <span
              className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${l.badgeClass}`}
            >
              {l.ratingLabel}
            </span>
            <span>
              <span className="font-medium text-slate-900">{l.name}</span>
              <span className="text-slate-500"> — {l.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
