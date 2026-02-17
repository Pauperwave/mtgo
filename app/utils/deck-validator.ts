/**
 * Deck validation utilities
 * Validates deck composition according to format rules
 */

import type { ParsedCard } from '~/types/deck'

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  stats: {
    mainDeckCount: number
    sideboardCount: number
    totalCards: number
  }
}

// Pre-defined constant - no need to recreate on every validation call
const EXEMPT_LANDS = new Set([
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Wastes'
])

// Validation messages
const VALIDATION_MESSAGES = {
  mainDeckTooSmall: (count: number) => ({
    type: 'error' as const,
    message: `Main deck deve contenere almeno 60 carte (attuale: ${count})`
  }),
  mainDeckTooLarge: (count: number) => ({
    type: 'warning' as const,
    message: `Main deck contiene più di 60 carte (attuale: ${count}).`
  }),
  sideboardTooSmall: (count: number) => ({
    type: 'warning' as const,
    message: `La Sideboard può contenere fino a 15 carte (attuale: ${count})`
  }),
  sideboardTooLarge: (count: number) => ({
    type: 'error' as const,
    message: `La Sideboard non può contenere più di 15 carte (attuale: ${count})`
  }),
  tooManyCopies: (cardName: string, count: number) => ({
    type: 'error' as const,
    message: `"${cardName}" supera il limite di 4 copie (attuale: ${count})`
  })
}

/**
 * Validate a Pauper deck
 */
export function validatePauperDeck(cards: readonly ParsedCard[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  let mainDeckCount = 0
  let sideboardCount = 0
  const cardCounts = new Map<string, number>()

  // Single pass: count cards, validate copies, separate deck/sideboard
  for (const card of cards) {
    // Update deck/sideboard counts
    if (card.isSideboard) {
      sideboardCount += card.quantity
    } else {
      mainDeckCount += card.quantity
    }

    // Rule 4: No more than 4 copies (skip exempt lands)
    if (EXEMPT_LANDS.has(card.name)) continue

    const currentCount = (cardCounts.get(card.name) || 0) + card.quantity

    if (currentCount > 4) {
      errors.push(VALIDATION_MESSAGES.tooManyCopies(card.name, currentCount))
    }

    cardCounts.set(card.name, currentCount)
  }

  // Rule 1: Main deck must be at least 60 cards
  if (mainDeckCount < 60) {
    errors.push(VALIDATION_MESSAGES.mainDeckTooSmall(mainDeckCount))
  }

  // Rule 2: Main deck should not exceed 60 cards (warning)
  if (mainDeckCount > 60) {
    warnings.push(VALIDATION_MESSAGES.mainDeckTooLarge(mainDeckCount))
  }

  // Rule 3: Sideboard must be exactly 0 or 15 cards
  if (sideboardCount > 0 && sideboardCount !== 15) {
    if (sideboardCount < 15) {
      warnings.push(VALIDATION_MESSAGES.sideboardTooSmall(sideboardCount))
    } else {
      errors.push(VALIDATION_MESSAGES.sideboardTooLarge(sideboardCount))
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      mainDeckCount,
      sideboardCount,
      totalCards: mainDeckCount + sideboardCount
    }
  }
}
