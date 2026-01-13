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
function sectionFromTypeLine(typeLine: string, isSideboard: boolean): Section {
  if (isSideboard) return 'Sideboard'

  if (typeLine.includes('Creature')) return 'Creature'
  if (typeLine.includes('Land')) return 'Land'
  if (typeLine.includes('Instant')) return 'Instant'
  if (typeLine.includes('Sorcery')) return 'Sorcery'
  if (typeLine.includes('Enchantment')) return 'Enchantment'
  if (typeLine.includes('Artifact')) return 'Artifact'

  // Fallback for malformed or unexpected data
  return 'Sorcery'
}

/* -------------------------------------------------
 * Create index from Scryfall cards
 * -------------------------------------------------
 * Helper to create O(1) lookup map
 */
export function createScryfallIndex(
  cards: readonly ScryfallCard[]
): ReadonlyMap<string, ScryfallCard> {
  return new Map(cards.map(card => [card.name, card]))
}

/* -------------------------------------------------
 * Normalize cards using Scryfall data (Array API)
 * -------------------------------------------------
 * Simple API for one-shot use
 * Builds index internally
 */
export function normalizeDeck(
  parsed: readonly ParsedCard[],
  scryfallCards: readonly ScryfallCard[]
): NormalizedCard[] {
  const index = createScryfallIndex(scryfallCards)
  return normalizeDeckWithIndex(parsed, index)
}

/* -------------------------------------------------
 * Normalize cards using pre-built index
 * -------------------------------------------------
 * Performance API for repeated use (live preview)
 * Expects caller to manage the index
 */
export function normalizeDeckWithIndex(
  parsed: readonly ParsedCard[],
  scryfallIndex: ReadonlyMap<string, ScryfallCard>
): NormalizedCard[] {
  return parsed.map((card) => {
    const scryfall = scryfallIndex.get(card.name)

    if (!scryfall) {
      throw new Error(`Missing Scryfall data for ${card.name}`)
    }

    return {
      ...card,
      section: sectionFromTypeLine(scryfall.type_line, card.isSideboard),
      cmc: scryfall.cmc
    }
  })
}

/* -------------------------------------------------
 * Sort cards within a section
 * -------------------------------------------------
 * Main deck: by CMC (mana value), then alphabetically
 * Sideboard: by quantity (descending), then alphabetically
 */
function sortCards(
  cards: readonly NormalizedCard[],
  section: Section
): NormalizedCard[] {
  const sorted = [...cards]

  if (section === 'Sideboard') {
    // Sideboard: by quantity (descending), then alphabetically
    sorted.sort((a, b) => {
      if (a.quantity !== b.quantity) {
        return b.quantity - a.quantity
      }
      return a.name.localeCompare(b.name)
    })
  } else {
    // Main deck: by CMC, then alphabetically
    sorted.sort((a, b) => {
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
 */
export function printDeck(cards: readonly NormalizedCard[]): string {
  return PRINT_ORDER.map((section) => {
    const group = cards.filter(c => c.section === section)

    if (!group.length) return ''

    const sorted = sortCards(group, section)
    const lines = sorted.map(c => `${c.quantity} ${c.name}`)

    return `${SECTION_LABEL[section]}\n${lines.join('\n')}`
  })
    .filter(Boolean)
    .join('\n\n')
}
