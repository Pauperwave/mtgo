// app/composables/useDeckNormalizer.ts
/**
 * Composable for deck normalization
 * Manages Scryfall index and provides normalized deck output
 */

import type { ParsedCard, ScryfallCard, NormalizedCard } from '~/types/deck'
import type { SuggestionGroup } from '~/types/suggestions'
import { createScryfallIndex, normalizeDeckWithIndex, printDeck } from '~/utils/deck-normalizer'
import { fetchScryfallDataWithConfidence, type FetchResultWithConfidence } from '~/services/scryfall'
import { getFrontFace } from '~/utils/card-name-normalization'

export function useDeckNormalizer() {
  const scryfallIndex = ref<ReadonlyMap<string, ScryfallCard> | null>(null)
  const nameMapping = ref<Record<string, string>>({}) // Track input → canonical name
  const performance = ref<PerformanceStats | null>(null) // Performance statistics
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
    performance.value = null

    try {
      const result: FetchResultWithConfidence = await fetchScryfallDataWithConfidence(cardNames)

      // Store name mappings from server
      nameMapping.value = result.nameMappings || {}

      // Store performance statistics
      if ('performance' in result) {
        performance.value = result.performance as PerformanceStats
      }

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
   * Returns formatted MTGO-style deck list with structured data
   * Accepts optional pending suggestions to include temporarily in output
   */
  function normalize(
    parsed: readonly ParsedCard[],
    pendingSuggestions?: ReadonlyMap<string, ScryfallCard>
  ): {
    output: string
    normalizedCards: NormalizedCard[]
    pendingCards: NormalizedCard[]
    missingCards: NormalizedCard[]
  } {
    if (!scryfallIndex.value) {
      throw new Error('Index not built yet. Call fetchAndBuildIndex first.')
    }

    const normalized = normalizeDeckWithIndex(
      parsed,
      scryfallIndex.value,
      nameMapping.value,
      pendingSuggestions
    )

    // Log land categories for visibility when "Normalizza Mazzo" is clicked
    // const landRows = normalized
    //   .filter(card => card.section === 'Land')
    //   .map(card => ({
    //     quantity: card.quantity,
    //     name: card.name,
    //     category: card.landCategory ?? 'Unknown'
    //   }))

    // if (landRows.length) {
    //   console.table(landRows)
    // }

    // Separate cards by status
    const pendingCards = normalized.filter(c => c.isPending)
    const missingCards = normalized.filter(c => c.isMissing)
    const validCards = normalized.filter(c => !c.isPending && !c.isMissing)

    return {
      output: printDeck(normalized),
      normalizedCards: normalized,
      pendingCards,
      missingCards
    }
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
    nameMapping.value = {}
    performance.value = null
    error.value = null
    autoAppliedCount.value = 0
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    autoAppliedCount: readonly(autoAppliedCount),
    performance: readonly(performance),
    fetchAndBuildIndex,
    normalize,
    updateIndexWithSuggestion,
    clearError,
    reset
  }
}
