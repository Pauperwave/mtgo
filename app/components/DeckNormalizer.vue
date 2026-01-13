<script setup lang="ts">
import { parseRawDeck } from '~/utils/deck-parser'
import { useDeckNormalizer } from '~/composables/useDeckNormalizer'
import { useClipboard } from '@vueuse/core'

// ============================================
// State
// ============================================

const input = ref('')
const normalizedOutput = ref('')
const missingCards = ref<string[]>([])

const { isLoading, error, fetchAndBuildIndex, normalize, clearError }
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

  try {
    const parsed = parseRawDeck(input.value)

    if (parsed.length === 0) {
      throw new Error('Nessuna carta trovata nell\'input')
    }

    // Fetch Scryfall data and build index
    const cardNames = parsed.map(c => c.name)
    await fetchAndBuildIndex(cardNames)

    // Normalize and display
    normalizedOutput.value = normalize(parsed)
  } catch (err) {
    console.error('Errore di normalizzazione:', err)

    // Extract missing card names from error message
    if (err instanceof Error && err.message.includes('Missing Scryfall data for:')) {
      const cardsString = err.message.replace('Missing Scryfall data for: ', '')
      missingCards.value = cardsString.split(', ').map(name => name.trim())
    }
  }
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
          <!-- Instructions Card -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-info"
                  class="size-5 text-primary"
                />
                <h3 class="text-sm font-semibold">
                  Come funziona
                </h3>
              </div>
            </template>

            <ul class="space-y-2 text-sm text-muted">
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle"
                  class="size-4 text-error mt-0.5 shrink-0"
                />
                <span>Incolla la lista del mazzo in formato MTGO</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle"
                  class="size-4 text-error mt-0.5 shrink-0"
                />
                <span>Usa "Sideboard" su una riga separata per separare le carte del sideboard</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle-dot-dashed"
                  class="size-4 text-warning mt-0.5 shrink-0"
                />
                <span>Clicca "Normalizza Mazzo" per recuperare i dati delle carte e formattare</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle-dot"
                  class="size-4 text-success mt-0.5 shrink-0"
                />
                <span>Main deck ordinato per valore di mana e ordine alfabetico</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle-dot"
                  class="size-4 text-success mt-0.5 shrink-0"
                />
                <span>Sideboard ordinato per quantità e ordine alfabetico</span>
              </li>
            </ul>
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
                <ul class="space-y-1">
                  <li
                    v-for="cardName in missingCards"
                    :key="cardName"
                    class="flex items-center gap-2 text-sm font-mono"
                  >
                    <UIcon
                      name="i-lucide-x-circle"
                      class="size-4 text-warning shrink-0"
                    />
                    <span>{{ cardName }}</span>
                  </li>
                </ul>
              </div>

              <div class="flex items-start gap-2 text-xs text-muted">
                <UIcon
                  name="i-lucide-lightbulb"
                  class="size-4 mt-0.5 shrink-0"
                />
                <span>
                  Prova a cercare la carta su
                  <a
                    href="https://scryfall.com"
                    target="_blank"
                    class="text-primary hover:underline"
                  >
                    Scryfall
                  </a>
                  per verificare il nome esatto.
                </span>
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

            <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 overflow-y-auto">
              <pre
                class="text-sm font-mono whitespace-pre-wrap text-gray-900 dark:text-gray-100"
              >{{ normalizedOutput }}</pre>
            </div>
          </UCard>

          <!-- Empty State -->
          <UCard
            v-if="!normalizedOutput && missingCards.length === 0"
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
