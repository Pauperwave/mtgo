<script setup lang="ts">
import { parseRawDeck } from '~/utils/deck-parser'
import { useDeckNormalizer } from '~/composables/useDeckNormalizer'
import { useClipboard } from '@vueuse/core'

// ============================================
// State
// ============================================

// const input = ref('')
const input = ref(`3 Krark-Clan Shaman
4 Refurbished Familiar
4 Myr Enforcer
1 Gearseeker Serpent
1 Kenku Artificer
3 Blood Fountain
4 Ichor Wellspring
2 Cryogen Relic
2 Toxin Analysis
4 Galvanic Blast
4 Reckoner's Bargain
2 Fanatical Offering
3 Thoughtcast
1 Makeshift Munitions
4 Drossforge Bridge
4 Mistvault Bridge
3 Silverbluff Bridge
3 Vault of Whispers
2 Seat of the Synod
2 Great Furnace
1 Island
1 Swamp

Sideboard
4 Blue Elemental Blast
3 Red Elemental Blast
2 Cast into the Fire
2 Negate
1 Gorilla Shaman
1 Extract a Confession
1 Breath Weapon
1 Unexpected Fangs`)
const normalizedOutput = ref('')

const { isLoading, error, fetchAndBuildIndex, normalize, clearError }
  = useDeckNormalizer()

// ============================================
// Normalization (button click)
// ============================================

async function handleNormalize() {
  if (!input.value.trim()) {
    return
  }

  try {
    const parsed = parseRawDeck(input.value)

    if (parsed.length === 0) {
      throw new Error('No cards found in the input')
    }

    // Fetch Scryfall data and build index
    const cardNames = parsed.map(c => c.name)
    await fetchAndBuildIndex(cardNames)

    // Normalize and display
    normalizedOutput.value = normalize(parsed)
  } catch (err) {
    console.error('Normalization error:', err)
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
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
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
        <h1 class="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
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
                  {{ lineCount }} lines
                </UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <UTextarea
                v-model="input"
                :rows="32"
                autoresize
                color="primary"
                variant="outline"
                size="lg"
                autofocus
                placeholder="Incolla la lista del tuo mazzo qui..."

                class="font-mono w-full"
              />

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
            </div>
          </UCard>

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
                  name="i-lucide-check"
                  class="size-4 text-success mt-0.5 flex-shrink-0"
                />
                <span>Incolla la lista del mazzo in formato MTGO</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="size-4 text-success mt-0.5 flex-shrink-0"
                />
                <span>Usa "Sideboard" su una riga separata per separare le carte del sideboard</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="size-4 text-success mt-0.5 flex-shrink-0"
                />
                <span>Main deck ordinato per valore di mana e poi in ordine alfabetico, sideboard per quantità e ordine alfabetico</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="size-4 text-success mt-0.5 flex-shrink-0"
                />
                <span>Clicca "Normalizza Mazzo" per recuperare i dati delle carte e formattare</span>
              </li>
            </ul>
          </UCard>
        </div>

        <!-- Right Column: Output -->
        <div class="space-y-4">
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
              <pre class="text-sm font-mono whitespace-pre-wrap text-gray-900 dark:text-gray-100">{{ normalizedOutput }}</pre>
            </div>
          </UCard>

          <!-- Empty State -->
          <UCard
            v-else
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
            Scryfall API
          </a>
          · Dati recuperati in tempo reale
        </p>
      </div>
    </div>
  </div>
</template>
