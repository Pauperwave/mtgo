/**
 * Composable for deck normalization
 * Manages Scryfall index and provides normalized deck output
 */

import type { ParsedCard, ScryfallCard } from '~/types/deck'
import { createScryfallIndex, normalizeDeckWithIndex, printDeck } from '~/utils/deck-normalizer'
import { fetchScryfallData } from '~/services/scryfall'

export function useDeckNormalizer() {
  const scryfallIndex = ref<ReadonlyMap<string, ScryfallCard> | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch Scryfall data and build the index
   * Call this once before using normalize()
   */
  async function fetchAndBuildIndex(cardNames: string[]) {
    isLoading.value = true
    error.value = null

    try {
      const cards = await fetchScryfallData(cardNames)
      scryfallIndex.value = createScryfallIndex(cards)
      return scryfallIndex.value
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
    return printDeck(normalized)
  }

  /**
   * Clear the error message
   */
  function clearError() {
    error.value = null
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchAndBuildIndex,
    normalize,
    clearError
  }
}
