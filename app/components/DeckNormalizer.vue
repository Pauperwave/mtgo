<!-- app\components\DeckNormalizer.vue -->
<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { shouldAutoApply } from '~/utils/card-autocorrect-whitelist'

// ============================================
// State
// ============================================

const input = ref('')
const normalizedOutput = ref('')
const missingCards = ref<string[]>([])
const validation = ref<ValidationResult | null>(null)

const { isLoading, error, fetchAndBuildIndex, normalize } = useDeckNormalizer()
const { copy, copied } = useClipboard()
const toast = useToast()

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

  try {
    const parsed = parseRawDeck(input.value)

    if (parsed.length === 0) {
      throw new Error('Nessuna carta trovata nell\'input')
    }

    // Validate deck
    validation.value = validatePauperDeck(parsed)

    const cardNames = parsed.map(c => c.name)
    const fetchedSuggestions = await fetchAndBuildIndex(cardNames)

    // ✨ Separate auto-apply and manual suggestions
    const autoApplySuggestions = fetchedSuggestions.filter(s =>
      shouldAutoApply(s.searchedName, s.suggestedCard.name)
    )

    const manualSuggestions = fetchedSuggestions.filter(s =>
      !shouldAutoApply(s.searchedName, s.suggestedCard.name)
    )

    // Auto-apply whitelisted cards (batch operation - no re-normalization)
    if (autoApplySuggestions.length > 0) {
      console.log('Auto-applying whitelisted suggestions:', autoApplySuggestions)

      // Apply all suggestions at once without triggering re-normalization
      let updatedInput = input.value
      autoApplySuggestions.forEach((suggestion) => {
        const searchedNameEscaped = suggestion.searchedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        updatedInput = updatedInput.replace(
          new RegExp(`(\\d+\\s+)${searchedNameEscaped}`, 'gi'),
          `$1${suggestion.suggestedCard.name}`
        )
      })

      // Update input once
      input.value = updatedInput

      const cardList = autoApplySuggestions
        .map(s => `• ${s.searchedName} → ${s.suggestedCard.name}`)
        .join('\n')

      toast.add({
        title: 'Correzioni automatiche applicate',
        description: `${autoApplySuggestions.length} ${autoApplySuggestions.length === 1 ? 'carta corretta' : 'carte corrette'}:\n${cardList}`,
        icon: 'i-lucide-sparkles',
        color: 'primary',
        duration: 6000,
        ui: {
          description: 'whitespace-pre-line',
          root: 'min-w-96'
        }
      })

      // Wait for input to update
      await nextTick()
    }

    // Show manual suggestions for review
    if (manualSuggestions.length > 0) {
      suggestions.setSuggestions(manualSuggestions)
    }

    // Normalize with updated input
    const finalParsed = parseRawDeck(input.value)
    normalizedOutput.value = normalize(finalParsed)
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
    validation.value = null
    suggestions.clearSuggestions()
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
          <ErrorCard
            v-if="error"
            :message="errorMessage"
            :lines="errorLines"
          />

          <ValidationCard
            v-if="validation"
            :validation="validation"
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
