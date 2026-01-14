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

/**
 * Validate a Pauper deck
 */
export function validatePauperDeck(cards: readonly ParsedCard[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Separate main deck and sideboard
  const mainDeck = cards.filter(c => !c.isSideboard)
  const sideboard = cards.filter(c => c.isSideboard)

  // Calculate totals
  const mainDeckCount = mainDeck.reduce((sum, c) => sum + c.quantity, 0)
  const sideboardCount = sideboard.reduce((sum, c) => sum + c.quantity, 0)

  // Rule 1: Main deck must be at least 60 cards
  if (mainDeckCount < 60) {
    errors.push({
      type: 'error',
      message: `Main deck deve contenere almeno 60 carte (attuale: ${mainDeckCount})`
    })
  }

  // Rule 2: Main deck should not exceed 60 cards (warning)
  if (mainDeckCount > 60) {
    warnings.push({
      type: 'warning',
      message: `Main deck contiene più di 60 carte (attuale: ${mainDeckCount}).`
    })
  }

  // Rule 3: Sideboard must be exactly 0 or 15 cards
  if (sideboardCount > 0 && sideboardCount !== 15) {
    if (sideboardCount < 15) {
      warnings.push({
        type: 'warning',
        message: `La Sideboard può contenere fino a 15 carte (attuale: ${sideboardCount})`
      })
    } else {
      errors.push({
        type: 'error',
        message: `La Sideboard non può contenere più di 15 carte (attuale: ${sideboardCount})`
      })
    }
  }

  // Rule 4: No more than 4 copies of any card (except basic lands)
  const basicLands = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'])

  const cardCounts = new Map<string, number>()
  for (const card of cards) {
    const currentCount = cardCounts.get(card.name) || 0
    cardCounts.set(card.name, currentCount + card.quantity)
  }

  for (const [cardName, count] of cardCounts) {
    if (!basicLands.has(cardName) && count > 4) {
      errors.push({
        type: 'error',
        message: `"${cardName}" supera il limite di 4 copie (attuale: ${count})`
      })
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
