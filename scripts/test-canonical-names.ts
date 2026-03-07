/**
 * Quick test to verify canonical name output
 * Run with: bun run scripts/test-canonical-names.ts
 */

import { createScryfallIndex, normalizeDeckWithIndex, printDeck } from '../app/utils/deck-normalizer'
import type { ParsedCard } from '../app/types/deck'

// Mock Scryfall cards
const mockCards = [
  {
    name: 'Delver of Secrets // Insectile Aberration',
    type_line: 'Creature — Human Wizard // Creature — Human Insect',
    cmc: 1,
    mana_cost: '{U}',
    color_identity: ['U']
  },
  {
    name: 'Lórien Revealed',
    type_line: 'Instant',
    cmc: 3,
    mana_cost: '{3}{U}{U}',
    color_identity: ['U']
  },
  {
    name: 'Ponder',
    type_line: 'Sorcery',
    cmc: 1,
    mana_cost: '{U}',
    color_identity: ['U']
  }
]

// User input (lowercase, missing diacritics)
const parsedDeck: ParsedCard[] = [
  { quantity: 4, name: 'delver of secrets', isSideboard: false },
  { quantity: 4, name: 'Lorien Revealed', isSideboard: false },
  { quantity: 4, name: 'ponder', isSideboard: false }
]

// Name mapping from server
const nameMapping = {
  'delver of secrets': 'Delver of Secrets // Insectile Aberration',
  'Lorien Revealed': 'Lórien Revealed',
  'ponder': 'Ponder'
}

console.log('🧪 Testing Canonical Name Output\n')

// Create index
const index = createScryfallIndex(mockCards)

// Normalize deck
const normalized = normalizeDeckWithIndex(parsedDeck, index, nameMapping)

// Print deck
const output = printDeck(normalized)

console.log('📝 Output:\n')
console.log(output)

console.log('\n✅ Expected canonical names:')
console.log('   - Delver of Secrets // Insectile Aberration (full DFC)')
console.log('   - Lórien Revealed (with diacritic ó)')
console.log('   - Ponder (correct capitalization)')

console.log('\n✨ Test complete!')
