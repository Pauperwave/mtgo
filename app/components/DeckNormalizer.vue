<script setup lang="ts">
import { parseRawDeck } from '~/utils/deck-parser'
import { useDeckNormalizer } from '~/composables/useDeckNormalizer'
import { useChecklist } from '~/composables/useChecklist'
import { useSuggestions } from '~/composables/useSuggestions'
import { useClipboard } from '@vueuse/core'

// Import sub-components
import ProgressChecklist from './deck-normalizer/ProgressChecklist.vue'
import InputCard from './deck-normalizer/InputCard.vue'
import ErrorCard from './deck-normalizer/ErrorCard.vue'
import SuggestionsCard from './deck-normalizer/SuggestionsCard.vue'
import MissingCardsCard from './deck-normalizer/MissingCardsCard.vue'
import OutputCard from './deck-normalizer/OutputCard.vue'
import EmptyState from './deck-normalizer/EmptyState.vue'

// ============================================
// State
// ============================================

const input = ref('')
const normalizedOutput = ref('')
const missingCards = ref<string[]>([])

const { isLoading, error, fetchAndBuildIndex, normalize } = useDeckNormalizer()
const { copy, copied } = useClipboard()

// ============================================
// Normalization
// ============================================

async function handleNormalize() {
  if (!input.value.trim()) return

  // Reset state
  missingCards.value = []
  normalizedOutput.value = ''
  suggestions.clearSuggestions()

  try {
    const parsed = parseRawDeck(input.value)

    if (parsed.length === 0) {
      throw new Error('Nessuna carta trovata nell\'input')
    }

    const cardNames = parsed.map(c => c.name)
    const fetchedSuggestions = await fetchAndBuildIndex(cardNames)

    suggestions.setSuggestions(fetchedSuggestions)
    normalizedOutput.value = normalize(parsed)
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

// ============================================
// Suggestions
// ============================================

const suggestions = useSuggestions(input, handleNormalize)

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
    suggestions.clearSuggestions()
  }
})

// ============================================
// Computed
// ============================================

const lineCount = computed(() => input.value.split('\n').filter(l => l.trim()).length)

const errorMessage = computed(() => {
  if (!error.value) return ''
  return error.value.split('\n\n')[0] || '' // ← Fix: garantisce sempre stringa
})

const errorLines = computed(() => {
  if (!error.value) return []
  const lines = error.value.split('\n')
  return lines.filter(line => line.trim().startsWith('•')).map(line => line.trim().replace('• ', ''))
})

const showEmptyState = computed(() =>
  !normalizedOutput.value
  && missingCards.value.length === 0
  && suggestions.suggestions.value.length === 0 // ← Rimosso .value se hai tolto readonly
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
          <ErrorCard
            v-if="error"
            :message="errorMessage"
            :lines="errorLines"
          />

          <MissingCardsCard
            v-if="missingCards.length > 0"
            :cards="missingCards"
          />

          <SuggestionsCard
            v-if="suggestions.suggestions.value.length > 0"
            :suggestions="suggestions.suggestions.value"
            @apply="suggestions.applySuggestion"
            @dismiss="suggestions.dismissSuggestion"
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
