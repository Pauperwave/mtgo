// app/services/scryfall.ts
/**
 * Card Resolution Service
 * Handles fetching card data via local API (SQLite + Scryfall fallback)
 *
 * New Flow:
 * 1. Send all card names to /api/cards/resolve (single request)
 * 2. Server looks up in SQLite database (10,573 Pauper cards)
 * 3. Server fetches missing cards from Scryfall (batch, 75/request)
 * 4. Returns all cards + name mappings
 *
 * Performance: ~50-100ms (was 2-4s)
 * API calls: 0-10 (was 40-120)
 */

import type { ScryfallCard } from '~/types/deck'
import type { CardSuggestion, SuggestionGroup } from '~/types/suggestions'
import type { ResolveCardsRequest, ResolveCardsResponse, PerformanceStats } from '~/shared/types'

/**
 * Result from fetching Scryfall data with confidence grouping
 */
export interface FetchResultWithConfidence {
  exactMatches: ScryfallCard[]
  suggestionGroup: SuggestionGroup
  totalCards: number
  nameMappings: Record<string, string>
  performance?: PerformanceStats
}

/**
 * Convert our Card type to ScryfallCard type (for compatibility)
 */
function cardToScryfallCard(card: any): ScryfallCard {
  return {
    name: card.name,
    type_line: card.type_line,
    cmc: card.cmc,
    mana_cost: card.mana_cost || null,
    oracle_text: card.oracle_text || null,
    color_identity: JSON.parse(card.color_identity || '[]')
  }
}

/**
 * Fetch card data via local API with SQLite database lookup
 *
 * This replaces the old approach of 40-120 individual Scryfall API calls
 * with a single server API call that does:
 * 1. SQLite lookup (10,573 Pauper cards) - instant
 * 2. Scryfall batch fetch for missing cards - 0-10 API calls
 *
 * @param cardNames - Array of card names to fetch
 * @returns Object with exact matches and categorized suggestions
 */
export async function fetchScryfallDataWithConfidence(
  cardNames: string[]
): Promise<FetchResultWithConfidence> {
  // Deduplicate card names
  const uniqueNames = Array.from(new Set(cardNames))

  try {
    // Call our server API (single request, handles everything)
    const response = await fetch('/api/cards/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        names: uniqueNames
      } as ResolveCardsRequest)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as ResolveCardsResponse

    // Convert to ScryfallCard format for compatibility
    const exactMatches = data.cards.map(cardToScryfallCard)

    // Create suggestions for missing cards
    const requireConfirmation: CardSuggestion[] = data.missing.map((name: string) => ({
      searchedName: name,
      suggestedCard: {
        name: name,
        type_line: 'Unknown',
        cmc: 0,
        mana_cost: null,
        oracle_text: null,
        color_identity: []
      },
      confidence: 'low' as const,
      matchType: 'ambiguous' as const
    }))

    return {
      exactMatches,
      suggestionGroup: {
        autoApply: [], // No fuzzy matching needed - we have exact normalized lookups
        requireConfirmation
      },
      totalCards: exactMatches.length,
      nameMappings: data.nameMappings,
      performance: data.performance
    }
  } catch (error) {
    console.error('Failed to fetch cards from API:', error)
    
    // Return empty result on error
    return {
      exactMatches: [],
      suggestionGroup: {
        autoApply: [],
        requireConfirmation: uniqueNames.map((name: string) => ({
          searchedName: name,
          suggestedCard: {
            name: name,
            type_line: 'Unknown',
            cmc: 0,
            mana_cost: null,
            oracle_text: null,
            color_identity: []
          },
          confidence: 'low' as const,
          matchType: 'ambiguous' as const
        }))
      },
      totalCards: 0,
      nameMappings: {}
    }
  }
}
