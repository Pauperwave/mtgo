// app/composables/useDeckNormalizer.ts
/**
 * Composable for deck normalization
 * Manages Scryfall index and provides normalized deck output
 */

import type { ParsedCard, ScryfallCard } from '~/types/deck'
import type { SuggestionGroup } from '~/types/suggestions'
import { createScryfallIndex, normalizeDeckWithIndex, printDeck } from '~/utils/deck-normalizer'
import { fetchScryfallDataWithConfidence, type FetchResultWithConfidence } from '~/services/scryfall'
import { getFrontFace } from '~/utils/card-name-normalization'

export function useDeckNormalizer() {
  const scryfallIndex = ref<ReadonlyMap<string, ScryfallCard> | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const autoAppliedCount = ref(0)

  /**
   * Fetch Scryfall data and build the index
   * Returns suggestions grouped by confidence level
   * Auto-apply suggestions are already included in the index
   */
  async function fetchAndBuildIndex(cardNames: string[]): Promise<SuggestionGroup> {
    isLoading.value = true
    error.value = null
    autoAppliedCount.value = 0

    try {
      const result: FetchResultWithConfidence = await fetchScryfallDataWithConfidence(cardNames)

      // Track how many were auto-applied
      autoAppliedCount.value = result.suggestionGroup.autoApply.length

      // Build index with all cards:
      // - Exact matches from Scryfall
      // - Auto-applied suggestions (high confidence)
      // - Manual suggestions (for user to review)
      const allCards = [
        ...result.exactMatches,
        ...result.suggestionGroup.autoApply.map(s => s.suggestedCard),
        ...result.suggestionGroup.requireConfirmation.map(s => s.suggestedCard)
      ]

      scryfallIndex.value = createScryfallIndex(allCards)

      return result.suggestionGroup
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
   * Update the index with a corrected card name
   * Used when user accepts a manual suggestion
   */
  function updateIndexWithSuggestion(suggestedCard: ScryfallCard) {
    if (!scryfallIndex.value) return

    const newMap = new Map(scryfallIndex.value)
    newMap.set(getFrontFace(suggestedCard.name), suggestedCard)

    scryfallIndex.value = newMap
  }

  /**
   * Clear the error message
   */
  function clearError() {
    error.value = null
  }

  /**
   * Reset all state
   */
  function reset() {
    scryfallIndex.value = null
    error.value = null
    autoAppliedCount.value = 0
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    autoAppliedCount: readonly(autoAppliedCount),
    fetchAndBuildIndex,
    normalize,
    updateIndexWithSuggestion,
    clearError,
    reset
  }
}
