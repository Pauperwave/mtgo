/**
 * ================================
 * Pauper decklist normalizer
 * ================================
 *
 * Goal
 * - Take a parsed decklist enriched with Scryfall type_line
 * - Assign each card to the correct Pauper section
 * - Print the deck using fixed MTGO style section headers
 *
 * Assumptions (Pauper-specific)
 * - No MDFCs exist in Pauper
 * - Adventure cards are always creatures
 * - If a card has "Creature" in type_line, it is a Creature
 */

import type {
  Section,
  ParsedCard,
  NormalizedCard,
  ScryfallCard
} from '~/types/deck'
import {
  categorizeLand,
  landCategoryRank
} from '~/utils/land-categories'
import { getFrontFace } from '~/utils/card-name-normalization'

/* -------------------------------------------------
 * Output order
 * -------------------------------------------------
 * This defines the exact order of sections when printed
 */
export const PRINT_ORDER: readonly Section[] = [
  'Creature',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Land',
  'Sideboard'
]

/* -------------------------------------------------
 * Output labels
 * -------------------------------------------------
 * This is where pluralization lives
 * Logic never depends on these strings
 */
export const SECTION_LABEL: Record<Section, string> = {
  Creature: 'Creatures',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantment',
  Land: 'Lands',
  Sideboard: 'Sideboard'
}

/* -------------------------------------------------
 * Resolve section from Scryfall type_line
 * -------------------------------------------------
 * Priority order matters and reflects Pauper reality
 * Sideboard always wins
 * Creature always wins (covers Adventures and artifact creatures)
 */
function sectionFromTypeLine(
  typeLine: string,
  isSideboard: boolean
): Section {
  if (isSideboard) return 'Sideboard'

  if (typeLine.includes('Creature')) return 'Creature'
  if (typeLine.includes('Land')) return 'Land'
  if (typeLine.includes('Instant')) return 'Instant'
  if (typeLine.includes('Sorcery')) return 'Sorcery'
  if (typeLine.includes('Enchantment')) return 'Enchantment'
  if (typeLine.includes('Artifact')) return 'Artifact'

  // Fallback for malformed or unexpected data
  return 'Unknown' as Section
}

/* -------------------------------------------------
 * Create index from Scryfall cards
 * -------------------------------------------------
 * Helper to create O(1) lookup map
 * Indexes only by front face name
 */
export function createScryfallIndex(
  cards: readonly ScryfallCard[]
): ReadonlyMap<string, ScryfallCard> {
  const index = new Map<string, ScryfallCard>()
  
  for (const card of cards) {
    // Index by front face name for DFC cards
    const frontFace = getFrontFace(card.name)
    index.set(frontFace, card)
  }
  
  return index
}

/* -------------------------------------------------
 * Normalize cards using pre-built index
 * -------------------------------------------------
 * Performance API for repeated use (live preview)
 * Expects caller to manage the index
 * Supports partial results with pending suggestions and missing cards
 */
export function normalizeDeckWithIndex(
  parsed: readonly ParsedCard[],
  scryfallIndex: ReadonlyMap<string, ScryfallCard>,
  nameMapping: Record<string, string> = {},
  pendingSuggestions: ReadonlyMap<string, ScryfallCard> = new Map()
): NormalizedCard[] {
  const normalized: NormalizedCard[] = []

  for (const card of parsed) {
    // PRIORITY 1: Check if this card has a pending suggestion (user hasn't accepted/rejected yet)
    // Use the ORIGINAL card name (before any mapping) to match against suggestions
    const pendingSuggestion = pendingSuggestions.get(card.name)
    
    if (pendingSuggestion) {
      // Card has a pending suggestion - mark as pending even if it's in the index
      const section = sectionFromTypeLine(pendingSuggestion.type_line, card.isSideboard)
      const landCategory = section === 'Land' ? categorizeLand(pendingSuggestion) : undefined

      normalized.push({
        ...card,
        name: pendingSuggestion.name, // Use suggested name
        section,
        cmc: pendingSuggestion.cmc,
        mana_cost: pendingSuggestion.mana_cost ?? null,
        landCategory,
        isPending: true // Mark as pending confirmation
      })
      continue
    }

    // PRIORITY 2: Try name mapping (input → canonical name from server)
    const mappedName = nameMapping[card.name]
    
    // Extract front face for DFC lookups
    const frontFace = getFrontFace(mappedName || card.name)
    const scryfall = scryfallIndex.get(frontFace)

    if (!scryfall) {
      // No match in index and no pending suggestion - mark as missing
      normalized.push({
        ...card,
        name: card.name, // Keep original name
        section: 'Unknown' as Section,
        cmc: 0,
        mana_cost: null,
        isMissing: true // Mark as missing
      })
      continue
    }

    // Card found in index - use Scryfall data (normal resolved flow)
    const section = sectionFromTypeLine(
      scryfall.type_line,
      card.isSideboard
    )

    const landCategory = section === 'Land'
      ? categorizeLand(scryfall)
      : undefined

    normalized.push({
      ...card,
      name: scryfall.name, // Use canonical name from Scryfall (with diacritics and // for DFCs)
      section,
      cmc: scryfall.cmc,
      mana_cost: scryfall.mana_cost ?? null,
      landCategory
    })
  }

  return normalized
}

/* -------------------------------------------------
 * Functional reprints map
 * -------------------------------------------------
 * Cards that are functionally identical but have different names
 * Used for sideboard sorting to group them together
 */
const FUNCTIONAL_REPRINTS: Record<string, string> = {
  'Blue Elemental Blast': 'Hydroblast',
  'Red Elemental Blast': 'Pyroblast'
}

/**
 * Get the canonical name for functional reprints
 * Returns the "main" card name for grouping purposes
 */
function getCanonicalName(cardName: string): string {
  return FUNCTIONAL_REPRINTS[cardName] || cardName
}

/**
 * Get the combined quantity for functional reprints
 */
function getCombinedQuantity(
  cards: readonly NormalizedCard[],
  card: NormalizedCard
): number {
  const canonicalName = getCanonicalName(card.name)

  return cards
    .filter(c => getCanonicalName(c.name) === canonicalName)
    .reduce((sum, c) => sum + c.quantity, 0)
}

/* -------------------------------------------------
 * Sort cards within a section
 * -------------------------------------------------
 * Main deck: by CMC (mana value), then alphabetically
 * Sideboard: by combined quantity (for functional reprints), then alphabetically
 */
function sortCards(cards: readonly NormalizedCard[], section: Section): NormalizedCard[] {
  const sorted = [...cards]

  if (section === 'Land') {
    // Custom land order: category rank > quantity > name
    sorted.sort((a, b) => {
      const categoryA = a.landCategory ?? categorizeLand({
        name: a.name,
        type_line: 'Land',
        cmc: a.cmc,
        oracle_text: '',
        color_identity: []
      })
      const categoryB = b.landCategory ?? categorizeLand({
        name: b.name,
        type_line: 'Land',
        cmc: b.cmc,
        oracle_text: '',
        color_identity: []
      })

      const rankA = landCategoryRank(categoryA)
      const rankB = landCategoryRank(categoryB)

      if (rankA !== rankB) return rankA - rankB
      if (a.quantity !== b.quantity) return b.quantity - a.quantity
      return a.name.localeCompare(b.name)
    })
  } else if (section === 'Sideboard') {
    // Sideboard: by combined quantity (descending), then alphabetically
    sorted.sort((a, b) => {
      const qtyA = getCombinedQuantity(cards, a)
      const qtyB = getCombinedQuantity(cards, b)

      if (qtyA !== qtyB) {
        return qtyB - qtyA
      }

      // If same combined quantity, sort by canonical name
      const canonicalA = getCanonicalName(a.name)
      const canonicalB = getCanonicalName(b.name)

      if (canonicalA !== canonicalB) {
        return canonicalA.localeCompare(canonicalB)
      }

      // Within the same functional group, sort by individual quantity (descending)
      if (a.quantity !== b.quantity) {
        return b.quantity - a.quantity
      }

      // If same quantity, sort alphabetically
      return a.name.localeCompare(b.name)
    })
  } else {
    // Main deck: by CMC, then alphabetically
    sorted.sort((a, b) => {
      const aHasX = (a.mana_cost || '').includes('X')
      const bHasX = (b.mana_cost || '').includes('X')

      if (aHasX !== bHasX) {
        return aHasX ? 1 : -1 // put X-cost cards last
      }

      if (a.cmc !== b.cmc) {
        return (a.cmc || 0) - (b.cmc || 0)
      }

      return a.name.localeCompare(b.name)
    })
  }

  return sorted
}

/* -------------------------------------------------
 * Print the deck in MTGO-style format
 * -------------------------------------------------
 * Sections are printed only if they contain cards
 * Cards are sorted according to section-specific rules
 * Pending and missing cards are included without special markers
 * (warnings are shown separately in the UI)
 */
export function printDeck(cards: readonly NormalizedCard[]): string {
  return PRINT_ORDER
    .map((section) => {
      const group = cards.filter(c => c.section === section && !c.isMissing)

      if (!group.length) return ''

      const sorted = sortCards(group, section)
      const lines = sorted.map(c => `${c.quantity} ${c.name}`)

      return `${SECTION_LABEL[section]}\n${lines.join('\n')}`
    })
    .filter(Boolean)
    .join('\n\n')
}
