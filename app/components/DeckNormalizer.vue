<!-- app/components/DeckNormalizer.vue -->
<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import type { CardSuggestion } from '~/types/suggestions'
import type { NormalizedCard } from '~/types/deck'

// ============================================
// State
// ============================================

const input = ref('')
const normalizedOutput = ref('')
const pendingCardsForOutput = ref<NormalizedCard[]>([]) // Cards with pending suggestions in output
const missingCardsForOutput = ref<NormalizedCard[]>([]) // Cards that couldn't be found
const validation = ref<ValidationResult | null>(null)
const isPartialOutput = ref(false) // Track if output contains pending/missing cards

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

const suggestions = useSuggestions(input, () => {
  // Called when all suggestions are resolved (accepted or dismissed)
  handleFinalizeDeck()
})

// ============================================
// Normalization
// ============================================

async function handleNormalize() {
  if (!input.value.trim()) return

  // Reset state
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

    // Generate output immediately (either complete or partial with pending suggestions)
    handleFinalizeDeck()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Errore durante la normalizzazione'
    toast.add({
      title: 'Errore di normalizzazione',
      description: errorMessage,
      color: 'error',
      icon: 'i-lucide-alert-circle',
      timeout: 0 // Keep error visible until dismissed
    })
  }
}

/**
 * Finalize deck normalization after all suggestions are resolved
 * Called automatically when no manual suggestions remain
 * Also called after each suggestion acceptance to show partial output
 */
function handleFinalizeDeck() {
  try {
    // Re-parse the (now corrected) deck input
    const finalParsed = parseRawDeck(input.value)

    // Build pending suggestions map from current suggestions
    // Use ORIGINAL card names (searchedName) as keys to match parsed input
    // Keep only FIRST (most confident) suggestion per card since array is pre-sorted by confidence
    const pendingSuggestionsMap = new Map<string, ScryfallCard>()
    for (const suggestion of suggestions.suggestions.value) {
      // Only set if key doesn't exist yet (keeps first/best match)
      if (!pendingSuggestionsMap.has(suggestion.searchedName)) {
        pendingSuggestionsMap.set(suggestion.searchedName, suggestion.suggestedCard)
      }
    }

    // Normalize using the cached Scryfall index with pending suggestions
    const result = normalize(finalParsed, pendingSuggestionsMap)

    // Update state with structured data
    normalizedOutput.value = result.output
    pendingCardsForOutput.value = result.pendingCards
    missingCardsForOutput.value = result.missingCards

    // Track if output is partial (has pending suggestions or missing cards)
    isPartialOutput.value = result.pendingCards.length > 0 || result.missingCards.length > 0
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Errore durante la generazione dell\'output'
    toast.add({
      title: 'Errore durante la generazione dell\'output',
      description: errorMessage,
      color: 'error',
      icon: 'i-lucide-alert-circle',
      timeout: 0 // Keep error visible until dismissed
    })
  }
}

/**
 * Handle user accepting a manual suggestion
 */
function handleAcceptSuggestion(suggestion: CardSuggestion) {
  // Update the Scryfall index with the accepted card
  updateIndexWithSuggestion(suggestion.suggestedCard)

  // Apply the suggestion to the input text
  // This also triggers handleFinalizeDeck when all suggestions are resolved
  suggestions.applySuggestion(suggestion)

  // Immediately regenerate output with the updated state
  handleFinalizeDeck()
}

/**
 * Handle user rejecting a manual suggestion
 */
function handleRejectSuggestion(searchedName: string) {
  suggestions.dismissSuggestion(searchedName)
  // When all suggestions are dismissed, the callback will trigger handleFinalizeDeck
  // Rejected cards will be marked as missing and highlighted in red in the output
  
  // Immediately regenerate output to show rejected card as missing
  handleFinalizeDeck()
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
      <!-- <div class="text-center mb-8">
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
      </div> -->

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
            :is-partial="isPartialOutput"
            :pending-cards="pendingCardsForOutput"
            :missing-cards="missingCardsForOutput"
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
