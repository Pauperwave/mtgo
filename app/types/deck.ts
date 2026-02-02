/**
 * Core type definitions for deck normalization
 */

export type Section
  = | 'Creature'
    | 'Instant'
    | 'Sorcery'
    | 'Artifact'
    | 'Enchantment'
    | 'Land'
    | 'Sideboard'

export type LandCategory
  = | 'Bounceland'
    | 'ArtifactBi'
    | 'ArtifactMono'
    | 'Gate'
    | 'Fixer'
    | 'TaplandBi'
    | 'TaplandMono'
    | 'Fetch'
    | 'Basic'
    | 'Other'

export interface ParsedCard {
  quantity: number
  name: string
  isSideboard: boolean
}

export interface NormalizedCard extends ParsedCard {
  section: Section
  cmc: number // ← Added
  landCategory?: LandCategory
}

export interface ScryfallCard {
  name: string
  type_line: string
  cmc: number // ← Added
  oracle_text: string
  color_identity: string[]
}
