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

interface DeckStats {
  mainDeckCount: number
  sideboardCount: number
  cardCounts: Map<string, number>
}

// Pre-defined constants
const EXEMPT_LANDS = new Set([
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Wastes'
])

const DECK_RULES = {
  MIN_MAIN_DECK: 60,
  OPTIMAL_MAIN_DECK: 60,
  MAX_SIDEBOARD: 15,
  OPTIMAL_SIDEBOARD: 15,
  MAX_COPIES: 4
} as const

// Validation messages factory
const createError = (message: string): ValidationError => ({ type: 'error', message })
const createWarning = (message: string): ValidationError => ({ type: 'warning', message })

const MESSAGES = {
  mainDeckTooSmall: (count: number) =>
    createError(`Main deck deve contenere almeno ${DECK_RULES.MIN_MAIN_DECK} carte (attuale: ${count})`),
  mainDeckTooLarge: (count: number) =>
    createWarning(`Main deck contiene più di ${DECK_RULES.OPTIMAL_MAIN_DECK} carte (attuale: ${count}).`),
  sideboardTooSmall: (count: number) =>
    createWarning(`La Sideboard può contenere fino a ${DECK_RULES.MAX_SIDEBOARD} carte (attuale: ${count})`),
  sideboardTooLarge: (count: number) =>
    createError(`La Sideboard non può contenere più di ${DECK_RULES.MAX_SIDEBOARD} carte (attuale: ${count})`),
  tooManyCopies: (cardName: string, count: number) =>
    createError(`"${cardName}" supera il limite di ${DECK_RULES.MAX_COPIES} copie (attuale: ${count})`)
} as const

/**
 * Analyze deck composition in a single pass
 */
function analyzeDeck(cards: readonly ParsedCard[]): DeckStats {
  let mainDeckCount = 0
  let sideboardCount = 0
  const cardCounts = new Map<string, number>()

  for (const card of cards) {
    // Count cards by location
    if (card.isSideboard) {
      sideboardCount += card.quantity
    } else {
      mainDeckCount += card.quantity
    }

    // Track non-exempt cards for copy limit validation
    if (!EXEMPT_LANDS.has(card.name)) {
      cardCounts.set(card.name, (cardCounts.get(card.name) || 0) + card.quantity)
    }
  }

  return { mainDeckCount, sideboardCount, cardCounts }
}

/**
 * Validate card copy limits
 */
function validateCopyLimits(cardCounts: Map<string, number>, errors: ValidationError[]): void {
  for (const [cardName, count] of cardCounts) {
    if (count > DECK_RULES.MAX_COPIES) {
      errors.push(MESSAGES.tooManyCopies(cardName, count))
    }
  }
}

/**
 * Validate main deck size requirements
 */
function validateMainDeckSize(count: number, errors: ValidationError[], warnings: ValidationError[]): void {
  if (count < DECK_RULES.MIN_MAIN_DECK) {
    errors.push(MESSAGES.mainDeckTooSmall(count))
  } else if (count > DECK_RULES.OPTIMAL_MAIN_DECK) {
    warnings.push(MESSAGES.mainDeckTooLarge(count))
  }
}

/**
 * Validate sideboard size requirements
 */
function validateSideboardSize(count: number, errors: ValidationError[], warnings: ValidationError[]): void {
  if (count === 0 || count === DECK_RULES.OPTIMAL_SIDEBOARD) return

  if (count < DECK_RULES.OPTIMAL_SIDEBOARD) {
    warnings.push(MESSAGES.sideboardTooSmall(count))
  } else {
    errors.push(MESSAGES.sideboardTooLarge(count))
  }
}

/**
 * Validate a Pauper deck
 */
export function validatePauperDeck(cards: readonly ParsedCard[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Analyze deck composition
  const { mainDeckCount, sideboardCount, cardCounts } = analyzeDeck(cards)

  // Run all validation rules
  validateCopyLimits(cardCounts, errors)
  validateMainDeckSize(mainDeckCount, errors, warnings)
  validateSideboardSize(sideboardCount, errors, warnings)

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
