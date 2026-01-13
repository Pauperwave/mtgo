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

export interface ParsedCard {
  quantity: number
  name: string
  isSideboard: boolean
}

export interface NormalizedCard extends ParsedCard {
  section: Section
  cmc: number
}

export interface ScryfallCard {
  name: string
  type_line: string
  cmc: number
}
