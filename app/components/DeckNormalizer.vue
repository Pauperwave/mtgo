<!-- app/components/DeckNormalizer.vue -->
<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import type { CardSuggestion } from '~/types/suggestions'

// ============================================
// State
// ============================================

const input = ref('')
const normalizedOutput = ref('')
const missingCards = ref<string[]>([])
const validation = ref<ValidationResult | null>(null)

const {
  isLoading,
  error,
  autoAppliedCount,
  performance,
  fetchAndBuildIndex,
  normalize,
  updateIndexWithSuggestion,
  clearError,
  reset: resetNormalizer
} = useDeckNormalizer()

const { copy, copied } = useClipboard()
const toast = useToast()

// ============================================
// Suggestions
// ============================================

const suggestions = useSuggestions(input)

// ============================================
// Normalization
// ============================================

async function handleNormalize() {
  if (!input.value.trim()) return

  // Reset state
  missingCards.value = []
  normalizedOutput.value = ''
  validation.value = null
  suggestions.clearSuggestions()
  clearError()

  try {
    const parsed = parseRawDeck(input.value)

    if (parsed.length === 0) {
      throw new Error('Nessuna carta trovata nell\'input')
    }

    // Validate deck structure
    validation.value = validatePauperDeck(parsed)

    // Extract unique card names
    const cardNames = Array.from(new Set(parsed.map(c => c.name)))

    // Fetch Scryfall data with confidence-based grouping
    const suggestionGroup = await fetchAndBuildIndex(cardNames)

    // Auto-apply high-confidence suggestions and store manual ones
    suggestions.setSuggestionsFromGroup(suggestionGroup)

    // Show toast for auto-applied corrections
    if (autoAppliedCount.value > 0) {
      const autoApplied = suggestionGroup.autoApply
      const cardList = autoApplied
        .map(s => `• ${s.searchedName} → ${s.suggestedCard.name}`)
        .join('\n')

      toast.add({
        title: 'Correzioni automatiche applicate',
        description: `${autoAppliedCount.value} ${autoAppliedCount.value === 1 ? 'carta corretta' : 'carte corrette'}:\n${cardList}`,
        icon: 'i-lucide-sparkles',
        color: 'primary',
        duration: 6000,
        ui: {
          description: 'whitespace-pre-line',
          root: 'min-w-96'
        }
      })
    }

    // If no manual suggestions remain, finalize immediately
    if (suggestionGroup.requireConfirmation.length === 0) {
      handleFinalizeDeck()
    } else {
      // Generate initial output even with pending suggestions
      // This allows inline updates when suggestions are applied
      handleFinalizeDeck()
    }
  } catch (err) {
    console.error('Errore di normalizzazione:', err)

    if (err instanceof Error && err.message.includes('Missing Scryfall data for:')) {
      const cardsString = err.message.replace('Missing Scryfall data for: ', '')
      if (cardsString) {
        missingCards.value = cardsString.split(', ').map(name => name.trim()).filter(Boolean)
      }
    }
  }
}

/**
 * Finalize deck normalization after all suggestions are resolved
 * Called automatically when no manual suggestions remain
 */
function handleFinalizeDeck() {
  try {
    // Re-parse the (now corrected) deck input
    const finalParsed = parseRawDeck(input.value)

    // Normalize using the cached Scryfall index
    normalizedOutput.value = normalize(finalParsed)
  } catch (err) {
    console.error('Failed to generate normalized output:', err)
  }
}

/**
 * Handle user accepting a manual suggestion
 */
function handleAcceptSuggestion(suggestion: CardSuggestion) {
  // Update the Scryfall index with the accepted card
  updateIndexWithSuggestion(suggestion.suggestedCard)

  // If we already have an output, update it inline instead of regenerating
  if (normalizedOutput.value) {
    // Replace the searched name with the suggested canonical name in the output
    const searchPattern = new RegExp(
      `^(\\d+)\\s+${escapeRegExp(suggestion.searchedName)}$`,
      'gm'
    )
    const replacement = `$1 ${suggestion.suggestedCard.name}`
    normalizedOutput.value = normalizedOutput.value.replace(searchPattern, replacement)
  }

  // Apply the suggestion to the input text
  // This will trigger handleFinalizeDeck when all suggestions are resolved
  suggestions.applySuggestion(suggestion)
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Handle user rejecting a manual suggestion
 */
function handleRejectSuggestion(searchedName: string) {
  suggestions.dismissSuggestion(searchedName)
  // Note: Output is not regenerated - it stays as is with the original name
}

// ============================================
// Checklist
// ============================================

const { checklistItems, completedCount, totalCount } = useChecklist(
  input,
  normalizedOutput,
  copied,
  isLoading
)

// ============================================
// Watch for input reset
// ============================================

watch(input, (newValue) => {
  if (!newValue.trim()) {
    normalizedOutput.value = ''
    missingCards.value = []
    validation.value = null
    suggestions.clearSuggestions()
    resetNormalizer()
  }
})

// ============================================
// Computed
// ============================================

const lineCount = computed(() => input.value.split('\n').filter(l => l.trim()).length)

const errorMessage = computed(() => {
  if (!error.value) return ''
  return error.value.split('\n\n')[0] || ''
})

const errorLines = computed(() => {
  if (!error.value) return []
  const lines = error.value.split('\n')
  return lines.filter(line => line.trim().startsWith('•')).map(line => line.trim().replace('• ', ''))
})

const showEmptyState = computed(() =>
  !normalizedOutput.value
  && missingCards.value.length === 0
  && suggestions.suggestions.value.length === 0
)

function copyToClipboard() {
  if (normalizedOutput.value) {
    copy(normalizedOutput.value)
  }
}
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
    <div class="container mx-auto px-4 py-8 max-w-7xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-3">
          <div class="p-3 bg-primary/10 rounded-xl">
            <UIcon
              name="i-lucide-sparkles"
              class="size-8 text-primary"
            />
          </div>
        </div>
        <h1 class="text-4xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
          Pauper Deck Normalizer
        </h1>
        <p class="text-muted text-lg">
          Trasforma la lista del tuo mazzo in formato MTGO
        </p>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: Input -->
        <div class="space-y-4">
          <ProgressChecklist
            :items="checklistItems"
            :completed-count="completedCount"
            :total-count="totalCount"
            :is-loading="isLoading"
          />

          <InputCard
            v-model="input"
            :line-count="lineCount"
            :is-loading="isLoading"
            @normalize="handleNormalize"
          />
        </div>

        <!-- Right Column: Output -->
        <div class="space-y-4">
          <!-- Auto-apply feedback -->
          <UAlert
            v-if="autoAppliedCount > 0 && !normalizedOutput"
            color="primary"
            icon="i-lucide-sparkles"
            title="Correzioni automatiche applicate"
            :description="`${autoAppliedCount} ${autoAppliedCount === 1 ? 'nome carta corretto' : 'nomi carta corretti'} automaticamente`"
          />

          <ErrorCard
            v-if="error"
            :message="errorMessage"
            :lines="errorLines"
          />

          <ValidationCard
            v-if="validation"
            :validation="validation"
          />

          <PerformanceCard
            v-if="performance"
            :performance="performance"
          />

          <MissingCardsCard
            v-if="missingCards.length > 0"
            :cards="missingCards"
          />

          <SuggestionsCard
            v-if="suggestions.suggestions.value.length > 0"
            :suggestions="suggestions.suggestions.value"
            @apply="handleAcceptSuggestion"
            @dismiss="handleRejectSuggestion"
          />

          <OutputCard
            v-if="normalizedOutput"
            :output="normalizedOutput"
            :copied="copied"
            @copy="copyToClipboard"
          />

          <EmptyState v-if="showEmptyState" />
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center">
        <p class="text-xs text-muted">
          Alimentato dall'<a
            href="https://scryfall.com"
            target="_blank"
            class="text-primary hover:underline"
          >API Scryfall</a>
          • Dati recuperati in tempo reale
        </p>
      </div>
    </div>
  </div>
</template>
