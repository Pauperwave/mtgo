// app\composables\useSuggestions.ts
/**
 * Composable for managing card suggestions
 */

import type { CardSuggestion } from './useDeckNormalizer'

export function useSuggestions(
  input: Ref<string>,
  onApply: () => void
) {
  const suggestions = ref<CardSuggestion[]>([])

  function applySuggestion(searchedName: string, suggestedName: string) {
    // Replace the incorrect name with the suggested one in the input
    input.value = input.value.replace(
      new RegExp(`(\\d+\\s+)${searchedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
      `$1${suggestedName}`
    )

    // Remove this suggestion
    suggestions.value = suggestions.value.filter(s => s.searchedName !== searchedName)

    // Re-normalize if there are no more suggestions
    if (suggestions.value.length === 0) {
      onApply()
    }
  }

  function dismissSuggestion(searchedName: string) {
    suggestions.value = suggestions.value.filter(s => s.searchedName !== searchedName)
  }

  function setSuggestions(newSuggestions: CardSuggestion[]) {
    suggestions.value = newSuggestions
  }

  function clearSuggestions() {
    suggestions.value = []
  }

  return {
    suggestions: readonly(suggestions),
    applySuggestion,
    dismissSuggestion,
    setSuggestions,
    clearSuggestions
  }
}
