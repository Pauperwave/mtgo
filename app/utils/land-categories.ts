import type { LandCategory, ScryfallCard } from '~/types/deck'
import {
  ARTIFACT_BI,
  ARTIFACT_MONO,
  BASIC,
  BOUNCELAND,
  FETCH,
  FIXER,
  GATES,
  TAPLAND_BI,
  TAPLAND_MONO
} from '~/constants/land-sets'

const CATEGORY_ORDER: LandCategory[] = [
  'Bounceland',
  'ArtifactBi',
  'ArtifactMono',
  'Gate',
  'Fixer',
  'TaplandBi',
  'TaplandMono',
  'Fetch',
  'Basic',
  'Other'
]

const CATEGORY_RANK: Record<LandCategory, number> = CATEGORY_ORDER
  .reduce((acc, cat, idx) => ({ ...acc, [cat]: idx }), {} as Record<LandCategory, number>)

const contains = (text: string | undefined, match: string) =>
  (text || '').toLowerCase().includes(match.toLowerCase())

const includesAll = (text: string | undefined, words: string[]) => {
  const lower = (text || '').toLowerCase()
  return words.every(w => lower.includes(w.toLowerCase()))
}

export function categorizeLand(card: ScryfallCard): LandCategory {
  const name = card.name
  const typeLine = card.type_line || ''
  const oracle = card.oracle_text || ''
  const colors = card.color_identity || []

  // Name-first classification in priority order
  if (BOUNCELAND.has(name)) return 'Bounceland'
  if (ARTIFACT_BI.has(name)) return 'ArtifactBi'
  if (ARTIFACT_MONO.has(name)) return 'ArtifactMono'
  if (GATES.has(name)) return 'Gate'
  if (FIXER.has(name)) return 'Fixer'
  if (TAPLAND_BI.has(name) && colors.length === 2) return 'TaplandBi'
  if (TAPLAND_MONO.has(name) && colors.length === 1) return 'TaplandMono'
  if (FETCH.has(name)) return 'Fetch'
  if (BASIC.has(name)) return 'Basic'

  // Heuristic fallback for unseen cards / reprints
  if (typeLine.includes('Basic')) return 'Basic'

  if (includesAll(oracle, ['return a land', 'control']) && contains(oracle, 'enters tapped')) {
    return 'Bounceland'
  }

  if (typeLine.includes('Land') && typeLine.includes('Artifact')) {
    if (contains(name, 'bridge')) return 'ArtifactBi'
    return 'ArtifactMono'
  }

  if (typeLine.includes('Gate')) return 'Gate'

  if (!typeLine.includes('Gate') && contains(oracle, 'any color')) {
    return 'Fixer'
  }

  if (contains(oracle, 'enters tapped')) {
    if (colors.length === 2) return 'TaplandBi'
    if (colors.length === 1) return 'TaplandMono'
  }

  if (includesAll(oracle, ['search', 'land'])) return 'Fetch'

  return 'Other'
}

export function landCategoryRank(category: LandCategory): number {
  return CATEGORY_RANK[category]
}

export { CATEGORY_ORDER }
