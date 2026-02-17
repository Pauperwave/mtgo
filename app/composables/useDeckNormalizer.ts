// app\composables\useDeckNormalizer.ts
/**
 * Composable for deck normalization
 * Manages Scryfall index and provides normalized deck output
 */

import type { ParsedCard, ScryfallCard } from '~/types/deck'
import { createScryfallIndex, normalizeDeckWithIndex, printDeck } from '~/utils/deck-normalizer'
import { fetchScryfallData, type FetchResult } from '~/services/scryfall'

export interface CardSuggestion {
  searchedName: string
  suggestedCard: ScryfallCard
}

export function useDeckNormalizer() {
  const scryfallIndex = ref<ReadonlyMap<string, ScryfallCard> | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const suggestions = ref<CardSuggestion[]>([])

  /**
   * Fetch Scryfall data and build the index
   * Returns suggestions for cards that needed fuzzy matching
   */
  async function fetchAndBuildIndex(cardNames: string[]): Promise<CardSuggestion[]> {
    isLoading.value = true
    error.value = null
    suggestions.value = []

    try {
      const result: FetchResult = await fetchScryfallData(cardNames)

      // Store suggestions
      suggestions.value = result.suggestions

      // Build index with all cards (exact matches + fuzzy matches)
      const allCards = [
        ...result.cards,
        ...result.suggestions.map(s => s.suggestedCard)
      ]

      scryfallIndex.value = createScryfallIndex(allCards)

      return result.suggestions
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch card data'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Normalize parsed cards using the cached index
   * Returns formatted MTGO-style deck list
   */
  function normalize(parsed: readonly ParsedCard[]): string {
    if (!scryfallIndex.value) {
      throw new Error('Index not built yet. Call fetchAndBuildIndex first.')
    }

    const normalized = normalizeDeckWithIndex(parsed, scryfallIndex.value)

    // Log land categories for visibility when "Normalizza Mazzo" is clicked
    const landRows = normalized
      .filter(card => card.section === 'Land')
      .map(card => ({
        quantity: card.quantity,
        name: card.name,
        category: card.landCategory ?? 'Unknown'
      }))

    if (landRows.length) {
      console.table(landRows)
    }

    return printDeck(normalized)
  }

  /**
   * Clear the error message
   */
  function clearError() {
    error.value = null
  }

  /**
   * Clear suggestions
   */
  function clearSuggestions() {
    suggestions.value = []
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    suggestions: readonly(suggestions),
    fetchAndBuildIndex,
    normalize,
    clearError,
    clearSuggestions
  }
}
