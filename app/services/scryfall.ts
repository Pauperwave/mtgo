// app/services/scryfall.ts
/**
 * Scryfall API Service
 * Handles fetching card data from Scryfall with intelligent fallback and rate limiting
 *
 * Flow for each card:
 * 1. Try exact match (case-sensitive)
 * 2. If not found, search with fuzzy matching
 * 3. Analyze results and categorize by confidence
 */

import type { ScryfallCard } from '~/types/deck'
import type { CardSuggestion, SuggestionGroup } from '~/types/suggestions'
import { processSuggestions } from '~/utils/suggestion-scorer'

/**
 * Result from fetching Scryfall data with confidence grouping
 */
export interface FetchResultWithConfidence {
  exactMatches: ScryfallCard[]
  suggestionGroup: SuggestionGroup
  totalCards: number
}

/**
 * Fetch card data from Scryfall with confidence-based suggestion grouping
 *
 * For each card name:
 * 1. First tries exact match API
 * 2. Falls back to search API if no exact match
 * 3. Processes results with confidence scoring
 *
 * @param cardNames - Array of card names to fetch
 * @returns Object with exact matches and categorized suggestions
 */
export async function fetchScryfallDataWithConfidence(
  cardNames: string[]
): Promise<FetchResultWithConfidence> {
  const exactMatches: ScryfallCard[] = []
  const allAutoApply: CardSuggestion[] = []
  const allRequireConfirmation: CardSuggestion[] = []

  // Deduplicate card names to avoid redundant API calls
  const uniqueNames = Array.from(new Set(cardNames))

  for (const cardName of uniqueNames) {
    try {
      // Step 1: Try exact match first (most reliable)
      const exactCard = await fetchExactCard(cardName)

      if (exactCard) {
        exactMatches.push(exactCard)
        continue
      }

      // Step 2: If no exact match, try fuzzy search
      const suggestionGroup = await searchCardWithConfidence(cardName)

      allAutoApply.push(...suggestionGroup.autoApply)
      allRequireConfirmation.push(...suggestionGroup.requireConfirmation)

      // Scryfall rate limit: 50-100 requests per second
      // We use 100ms delay to be safe
      await delay(100)
    } catch (err) {
      console.error(`Failed to fetch card: ${cardName}`, err)
      // Continue processing other cards even if one fails
    }
  }

  return {
    exactMatches,
    suggestionGroup: {
      autoApply: allAutoApply,
      requireConfirmation: allRequireConfirmation
    },
    totalCards: exactMatches.length + allAutoApply.length + allRequireConfirmation.length
  }
}

/**
 * Fetch a card by exact name match from Scryfall
 * Uses the /cards/named?exact endpoint for case-sensitive exact matching
 *
 * @param cardName - The exact card name to look up
 * @returns Card data if found, null otherwise
 */
async function fetchExactCard(cardName: string): Promise<ScryfallCard | null> {
  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
    )

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

/**
 * Search for a card using Scryfall's search API
 * Returns confidence-categorized suggestions for non-exact matches
 *
 * @param cardName - Card name to search for
 * @returns Grouped suggestions (auto-apply and require confirmation)
 */
async function searchCardWithConfidence(cardName: string): Promise<SuggestionGroup> {
  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(cardName)}&unique=cards`
    )

    // Handle HTTP errors gracefully
    if (!response.ok) {
      return { autoApply: [], requireConfirmation: [] }
    }

    // Check content type - Scryfall returns HTML when rate limited
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Scryfall returned non-JSON response (possibly rate limited)')
      return { autoApply: [], requireConfirmation: [] }
    }

    const searchResults = await response.json()

    // Process results with confidence scoring
    return processSuggestions(cardName, searchResults)
  } catch (error) {
    console.error('Scryfall search failed:', error)
    return { autoApply: [], requireConfirmation: [] }
  }
}

/**
 * Utility delay function for rate limiting
 * Creates a promise that resolves after specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
