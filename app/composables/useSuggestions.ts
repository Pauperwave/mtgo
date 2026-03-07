// app/composables/useSuggestions.ts
/**
 * Suggestion Management Composable
 * Handles applying and dismissing card name correction suggestions
 */

import type { CardSuggestion, SuggestionGroup } from '~/types/suggestions'
import { escapeRegexName } from '~/utils/card-name-normalization'

/**
 * Create a regex to match card names with their quantities
 * Pattern: captures quantity (e.g., "4 ") followed by card name as whole word
 * Example: "4 Lightning Bolt" matches and captures "4 "
 */
function createCardNameRegex(searchedName: string): RegExp {
  return new RegExp(`(\\d+\\s+)${escapeRegexName(searchedName)}\\b`, 'gi')
}

/**
 * Composable for managing card suggestions
 * @param input - Reactive reference to the deck input text
 * @param onApply - Callback when all suggestions are resolved (triggers final normalization)
 */
export function useSuggestions(
  input: Ref<string>,
  onApply: () => void
) {
  const suggestions = ref<CardSuggestion[]>([])

  /**
   * Apply a single suggestion to the input text
   * Replaces all occurrences of the searched name with the suggested card name
   * Triggers normalization when no suggestions remain
   */
  function applySuggestion(suggestion: CardSuggestion) {
    const { searchedName, suggestedCard } = suggestion

    input.value = input.value.replace(
      createCardNameRegex(searchedName),
      `$1${suggestedCard.name}`
    )

    removeSuggestion(searchedName)

    if (suggestions.value.length === 0) {
      onApply()
    }
  }

  /**
   * Apply multiple suggestions at once (used for auto-apply)
   * More efficient than applying one by one
   */
  function applyMultipleSuggestions(suggestionsToApply: CardSuggestion[]) {
    let updatedInput = input.value

    for (const suggestion of suggestionsToApply) {
      const { searchedName, suggestedCard } = suggestion

      updatedInput = updatedInput.replace(
        createCardNameRegex(searchedName),
        `$1${suggestedCard.name}`
      )
    }

    input.value = updatedInput

    const appliedNames = new Set(suggestionsToApply.map(s => s.searchedName))
    suggestions.value = suggestions.value.filter(s => !appliedNames.has(s.searchedName))

    if (suggestions.value.length === 0) {
      onApply()
    }
  }

  /**
   * Dismiss a suggestion without applying it
   * User chooses to keep the original card name
   */
  function dismissSuggestion(searchedName: string) {
    removeSuggestion(searchedName)
  }

  /**
   * Remove a specific suggestion from the list
   */
  function removeSuggestion(searchedName: string) {
    suggestions.value = suggestions.value.filter(s => s.searchedName !== searchedName)
  }

  /**
   * Set suggestions from a grouped API result
   * Auto-applies high-confidence suggestions and stores rest for confirmation
   */
  function setSuggestionsFromGroup(group: SuggestionGroup) {
    if (group.autoApply.length > 0) {
      applyMultipleSuggestions(group.autoApply)
    }

    suggestions.value = group.requireConfirmation
  }

  /**
   * Clear all suggestions (e.g., when input changes)
   */
  function clearSuggestions() {
    suggestions.value = []
  }

  return {
    suggestions: readonly(suggestions),
    applySuggestion,
    applyMultipleSuggestions,
    dismissSuggestion,
    setSuggestionsFromGroup,
    clearSuggestions
  }
}
