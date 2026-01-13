<script setup lang="ts">
import { parseRawDeck } from '~/utils/deck-parser'
import { useDeckNormalizer, type CardSuggestion } from '~/composables/useDeckNormalizer'
import { useClipboard } from '@vueuse/core'

// ============================================
// State
// ============================================

const input = ref('')
const normalizedOutput = ref('')
const missingCards = ref<string[]>([])
const cardSuggestions = ref<CardSuggestion[]>([])

const { isLoading, error, suggestions, fetchAndBuildIndex, normalize, clearError, clearSuggestions }
  = useDeckNormalizer()

// ============================================
// Normalization (button click)
// ============================================

async function handleNormalize() {
  if (!input.value.trim()) {
    return
  }

  // Reset state
  missingCards.value = []
  normalizedOutput.value = ''
  cardSuggestions.value = []

  try {
    const parsed = parseRawDeck(input.value)

    if (parsed.length === 0) {
      throw new Error('Nessuna carta trovata nell\'input')
    }

    // Fetch Scryfall data and build index
    const cardNames = parsed.map(c => c.name)
    const fetchedSuggestions = await fetchAndBuildIndex(cardNames)

    // Store suggestions
    cardSuggestions.value = fetchedSuggestions

    // Normalize and display
    normalizedOutput.value = normalize(parsed)
  } catch (err) {
    console.error('Errore di normalizzazione:', err)

    // Extract missing card names from error message
    if (err instanceof Error && err.message.includes('Missing Scryfall data for:')) {
      const cardsString = err.message.replace('Missing Scryfall data for: ', '')
      if (cardsString) {
        missingCards.value = cardsString.split(', ').map(name => name.trim()).filter(Boolean)
      }
    }
  }
}

// ============================================
// Apply suggestion
// ============================================

function applySuggestion(searchedName: string, suggestedName: string) {
  // Replace the incorrect name with the suggested one in the input
  input.value = input.value.replace(
    new RegExp(`(\\d+\\s+)${searchedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
    `$1${suggestedName}`
  )

  // Remove this suggestion
  cardSuggestions.value = cardSuggestions.value.filter(s => s.searchedName !== searchedName)

  // Re-normalize if there are no more suggestions
  if (cardSuggestions.value.length === 0) {
    handleNormalize()
  }
}

function dismissSuggestion(searchedName: string) {
  cardSuggestions.value = cardSuggestions.value.filter(s => s.searchedName !== searchedName)
}

// ============================================
// Copy to clipboard
// ============================================

const { copy, copied } = useClipboard()

function copyToClipboard() {
  if (normalizedOutput.value) {
    copy(normalizedOutput.value)
  }
}

const lineCount = computed(() => input.value.split('\n').filter(l => l.trim()).length)

// ============================================
// Checklist state
// ============================================

const hasInput = computed(() => input.value.trim().length > 0)
const hasSideboard = computed(() => /^sideboard$/im.test(input.value))
const hasNormalized = computed(() => normalizedOutput.value.length > 0)
const hasCopied = computed(() => copied.value)

interface ChecklistItem {
  id: string
  label: string
  completed: ComputedRef<boolean>
  icon: ComputedRef<string>
  color: ComputedRef<string>
  children?: ChecklistItem[]
}

const checklistItems = computed<ChecklistItem[]>(() => [
  {
    id: 'paste',
    label: 'Incolla la lista del mazzo in formato MTGO',
    completed: hasInput,
    icon: computed(() => hasInput.value ? 'i-lucide-check-circle-2' : 'i-lucide-circle'),
    color: computed(() => hasInput.value ? 'text-success' : 'text-muted')
  },
  {
    id: 'sideboard',
    label: 'Usa "Sideboard" su una riga separata per separare le carte del sideboard',
    completed: hasSideboard,
    icon: computed(() => hasSideboard.value ? 'i-lucide-check-circle-2' : 'i-lucide-circle'),
    color: computed(() => hasSideboard.value ? 'text-success' : 'text-muted')
  },
  {
    id: 'normalize',
    label: 'Clicca "Normalizza Mazzo" per recuperare i dati delle carte e formattare',
    completed: hasNormalized,
    icon: computed(() => 
      hasNormalized.value 
        ? 'i-lucide-check-circle-2' 
        : isLoading.value 
          ? 'i-lucide-loader-circle' 
          : 'i-lucide-circle'
    ),
    color: computed(() => 
      hasNormalized.value 
        ? 'text-success' 
        : isLoading.value 
          ? 'text-warning' 
          : 'text-muted'
    ),
    children: [
      {
        id: 'main-sort',
        label: 'Main deck ordinato per valore di mana e poi in ordine alfabetico',
        completed: hasNormalized,
        icon: computed(() => hasNormalized.value ? 'i-lucide-check' : 'i-lucide-arrow-right'),
        color: computed(() => hasNormalized.value ? 'text-success' : 'text-muted')
      },
      {
        id: 'sideboard-sort',
        label: 'Sideboard per quantità e ordine alfabetico',
        completed: hasNormalized,
        icon: computed(() => hasNormalized.value ? 'i-lucide-check' : 'i-lucide-arrow-right'),
        color: computed(() => hasNormalized.value ? 'text-success' : 'text-muted')
      }
    ]
  },
  {
    id: 'copy',
    label: 'Clicca "Copia" per copiare l\'output normalizzato negli appunti',
    completed: hasCopied,
    icon: computed(() => hasCopied.value ? 'i-lucide-check-circle-2' : 'i-lucide-circle'),
    color: computed(() => hasCopied.value ? 'text-success' : 'text-muted')
  }
])

const completedCount = computed(() => {
  let count = 0
  if (hasInput.value) count++
  if (hasSideboard.value) count++
  if (hasNormalized.value) count++
  if (hasCopied.value) count++
  return count
})

const totalCount = 4
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

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        :title="error"
        class="mb-6"
        :close-button="{ icon: 'i-lucide-x', color: 'error', variant: 'link' }"
        @close="clearError"
      />

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: Input -->
        <div class="space-y-4">
          <!-- Dynamic Checklist Card -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-list-checks"
                    class="size-5 text-primary"
                  />
                  <h3 class="text-sm font-semibold">
                    Progresso
                  </h3>
                </div>
                <UBadge
                  :color="completedCount === totalCount ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ completedCount }}/{{ totalCount }}
                </UBadge>
              </div>
            </template>

            <div class="space-y-3">
              <!-- Progress Bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                  :style="{ width: `${(completedCount / totalCount) * 100}%` }"
                />
              </div>

              <!-- Checklist Items -->
              <ul class="space-y-2 text-sm">
                <li
                  v-for="item in checklistItems"
                  :key="item.id"
                  class="space-y-1"
                >
                  <div class="flex items-start gap-2">
                    <UIcon
                      :name="item.icon.value"
                      :class="[
                        'size-4 mt-0.5 shrink-0 transition-colors',
                        item.color.value,
                        isLoading && item.id === 'normalize' ? 'animate-spin' : ''
                      ]"
                    />
                    <span
                      :class="[
                        'transition-colors',
                        item.completed.value ? 'text-default' : 'text-muted'
                      ]"
                    >
                      {{ item.label }}
                    </span>
                  </div>

                  <!-- Child items (sub-steps) -->
                  <ul
                    v-if="item.children"
                    class="ml-6 space-y-1"
                  >
                    <li
                      v-for="child in item.children"
                      :key="child.id"
                      class="flex items-start gap-2"
                    >
                      <UIcon
                        :name="child.icon.value"
                        :class="[
                          'size-4 mt-0.5 shrink-0 transition-colors',
                          child.color.value
                        ]"
                      />
                      <span
                        :class="[
                          'text-xs transition-colors',
                          child.completed.value ? 'text-default' : 'text-muted'
                        ]"
                      >
                        {{ child.label }}
                      </span>
                    </li>
                  </ul>
                </li>
              </ul>

              <!-- Completion Message -->
              <div
                v-if="completedCount === totalCount"
                class="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2"
              >
                <UIcon
                  name="i-lucide-party-popper"
                  class="size-5 text-success shrink-0"
                />
                <span class="text-sm text-success font-medium">
                  Complimenti! Hai completato tutti i passaggi.
                </span>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-file-input"
                    class="size-5 text-primary"
                  />
                  <h2 class="text-lg font-semibold">
                    Input
                  </h2>
                </div>
                <UBadge
                  v-if="input.trim()"
                  color="neutral"
                  variant="subtle"
                >
                  {{ lineCount }} righe
                </UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <UButton
                icon="i-lucide-wand-sparkles"
                size="lg"
                block
                :loading="isLoading"
                :disabled="!input.trim()"
                @click="handleNormalize"
              >
                {{ isLoading ? 'Normalizzazione in corso...' : 'Normalizza Mazzo' }}
              </UButton>

              <UTextarea
                v-model="input"
                autoresize
                color="primary"
                variant="outline"
                size="lg"
                autofocus
                placeholder="Incolla la lista del tuo mazzo qui..."
                class="font-mono w-full"
              />
            </div>
          </UCard>
        </div>

        <!-- Right Column: Output -->
        <div class="space-y-4">
          <!-- Missing Cards Warning -->
          <UCard
            v-if="missingCards.length > 0"
            color="warning"
            class="border-warning/50"
          >
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="size-5 text-warning"
                />
                <h2 class="text-lg font-semibold">
                  Carte Non Trovate
                </h2>
              </div>
            </template>

            <div class="space-y-3">
              <p class="text-sm text-muted">
                {{ missingCards.length > 1 ? 'Le seguenti carte non sono state trovate' : 'La seguente carta non è stata trovata' }} su Scryfall.
                Controlla l'ortografia o il nome della carta.
              </p>

              <div class="bg-warning/5 rounded-lg p-3 border border-warning/20">
                <ul class="space-y-2">
                  <li
                    v-for="cardName in missingCards"
                    :key="cardName"
                    class="flex items-center justify-between gap-3"
                  >
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <UIcon
                        name="i-lucide-x-circle"
                        class="size-4 text-warning shrink-0"
                      />
                      <span class="font-mono text-sm truncate">{{ cardName }}</span>
                    </div>
                    <UButton
                      :to="`https://scryfall.com/search?q=${encodeURIComponent(cardName)}`"
                      target="_blank"
                      size="xs"
                      variant="soft"
                      color="warning"
                      icon="i-lucide-search"
                      trailing
                    >
                      Cerca
                    </UButton>
                  </li>
                </ul>
              </div>

              <div class="flex items-start gap-2 text-xs text-muted">
                <UIcon
                  name="i-lucide-lightbulb"
                  class="size-4 mt-0.5 shrink-0"
                />
                <span>
                  Clicca su "Cerca" per trovare la carta su Scryfall e verificare il nome esatto.
                </span>
              </div>
            </div>
          </UCard>

          <!-- Card Suggestions -->
          <UCard
            v-if="cardSuggestions.length > 0"
            color="info"
            class="border-info/50"
          >
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-lightbulb"
                  class="size-5 text-info"
                />
                <h2 class="text-lg font-semibold">
                  Suggerimenti Correzione
                </h2>
              </div>
            </template>

            <div class="space-y-3">
              <p class="text-sm text-muted">
                {{ cardSuggestions.length > 1 ? 'Sono state trovate' : 'È stata trovata' }} delle corrispondenze simili per {{ cardSuggestions.length > 1 ? 'le seguenti carte' : 'la seguente carta' }}.
                Vuoi applicare {{ cardSuggestions.length > 1 ? 'le correzioni' : 'la correzione' }}?
              </p>

              <div class="space-y-2">
                <div
                  v-for="suggestion in cardSuggestions"
                  :key="suggestion.searchedName"
                  class="bg-info/5 rounded-lg p-3 border border-info/20"
                >
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <UIcon
                          name="i-lucide-arrow-right"
                          class="size-4 text-info shrink-0"
                        />
                        <span class="text-sm font-semibold">Hai scritto:</span>
                      </div>
                      <p class="font-mono text-sm text-muted line-through ml-6">
                        {{ suggestion.searchedName }}
                      </p>

                      <div class="flex items-center gap-2 mt-2 mb-1">
                        <UIcon
                          name="i-lucide-check"
                          class="size-4 text-success shrink-0"
                        />
                        <span class="text-sm font-semibold">Forse intendevi:</span>
                      </div>
                      <p class="font-mono text-sm ml-6">
                        {{ suggestion.suggestedCard.name }}
                      </p>
                    </div>
                  </div>

                  <div class="flex gap-2 mt-3">
                    <UButton
                      size="xs"
                      color="info"
                      variant="solid"
                      icon="i-lucide-check"
                      @click="applySuggestion(suggestion.searchedName, suggestion.suggestedCard.name)"
                    >
                      Applica Correzione
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      @click="dismissSuggestion(suggestion.searchedName)"
                    >
                      Ignora
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Normalized Output -->
          <UCard
            v-if="normalizedOutput"
            class="border-success/20"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-file-check"
                    class="size-5 text-success"
                  />
                  <h2 class="text-lg font-semibold">
                    Output Normalizzato
                  </h2>
                </div>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="success"
                  :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                  @click="copyToClipboard"
                >
                  {{ copied ? 'Copiato!' : 'Copia' }}
                </UButton>
              </div>
            </template>

            <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-y-auto">
              <pre class="text-sm font-mono whitespace-pre-wrap text-gray-900 dark:text-gray-100">{{ normalizedOutput }}</pre>
            </div>
          </UCard>

          <!-- Empty State -->
          <UCard
            v-if="!normalizedOutput && missingCards.length === 0 && cardSuggestions.length === 0"
            class="border-dashed"
          >
            <div class="flex flex-col items-center justify-center py-16 text-center">
              <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <UIcon
                  name="i-lucide-file-output"
                  class="size-8 text-muted"
                />
              </div>
              <h3 class="text-lg font-semibold mb-2">
                Ancora nessun output
              </h3>
              <p class="text-sm text-muted max-w-xs">
                Incolla la lista del tuo mazzo e clicca "Normalizza Mazzo" per vedere l'output formattato
              </p>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center">
        <p class="text-xs text-muted">
          Alimentato dall'
          <a
            href="https://scryfall.com"
            target="_blank"
            class="text-primary hover:underline"
          >
            API Scryfall
          </a>
          • Dati recuperati in tempo reale
        </p>
      </div>
    </div>
  </div>
</template>
