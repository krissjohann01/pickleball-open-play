import type { SkillLevel } from './types'

export interface SkillLevelInfo {
  value: SkillLevel
  ratingLabel: string
  name: string
  /** Representative numeric rating used for court-balancing. */
  rating: number
  badgeClass: string
  /** One-line description of typical gameplay at this level, for self-rating. */
  description: string
}

export const SKILL_LEVELS: SkillLevelInfo[] = [
  {
    value: 'novice_beginner',
    ratingLabel: '2.0–2.5',
    name: 'Novice & Beginner',
    rating: 2.25,
    badgeClass: 'bg-green-100 text-green-800',
    description: 'Still learning the rules and court positioning; rallies are short with inconsistent control.',
  },
  {
    value: 'advanced_beginner',
    ratingLabel: '3.0',
    name: 'Advanced Beginner',
    rating: 3.0,
    badgeClass: 'bg-lime-100 text-lime-800',
    description: 'Knows the kitchen rules and basic strategy; sustains rallies but relies on power over touch.',
  },
  {
    value: 'intermediate',
    ratingLabel: '3.5',
    name: 'Intermediate',
    rating: 3.5,
    badgeClass: 'bg-amber-100 text-amber-800',
    description: 'The average competitive rec/club player; developing dinks and third-shot drops.',
  },
  {
    value: 'advanced_intermediate',
    ratingLabel: '4.0',
    name: 'Advanced Intermediate',
    rating: 4.0,
    badgeClass: 'bg-orange-100 text-orange-800',
    description: 'High consistency with few unforced errors; dictates pace and sets up offense.',
  },
  {
    value: 'advanced_competitive',
    ratingLabel: '4.5',
    name: 'Advanced / Competitive',
    rating: 4.5,
    badgeClass: 'bg-rose-100 text-rose-800',
    description: 'Upper-tier tournament players with a strong soft game and disciplined footwork.',
  },
  {
    value: 'pro_open',
    ratingLabel: '5.0–5.5+',
    name: 'Pro / Open Division',
    rating: 5.25,
    badgeClass: 'bg-purple-100 text-purple-800',
    description: 'Elite national/international competitors with near-flawless execution.',
  },
]

const BY_VALUE = new Map(SKILL_LEVELS.map((l) => [l.value, l]))

export function getSkillLevelInfo(level: SkillLevel): SkillLevelInfo {
  return BY_VALUE.get(level) ?? SKILL_LEVELS[0]
}

export function getSkillRating(level: SkillLevel): number {
  return getSkillLevelInfo(level).rating
}
