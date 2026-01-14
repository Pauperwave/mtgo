<script setup lang="ts">
import type { CardSuggestion } from '~/composables/useDeckNormalizer'

interface Props {
  suggestions: readonly CardSuggestion[]
}

interface Emits {
  (e: 'apply', searchedName: string, suggestedName: string): void
  (e: 'dismiss', searchedName: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <UCard
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
          Carte Non Riconosciute
        </h2>
      </div>
    </template>

    <div class="space-y-3">
      <p class="text-sm text-muted">
        {{ suggestions.length > 1 ? 'Le seguenti carte non sono state riconosciute' : 'La seguente carta non è stata riconosciuta' }} esattamente, ma {{ suggestions.length > 1 ? 'sono state trovate corrispondenze' : 'è stata trovata una corrispondenza' }} simili.
        Vuoi applicare {{ suggestions.length > 1 ? 'le correzioni' : 'la correzione' }}?
      </p>

      <div class="bg-info/5 rounded-lg p-3 border border-info/20">
        <ul class="space-y-2">
          <li
            v-for="suggestion in suggestions"
            :key="suggestion.searchedName"
            class="space-y-2"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 text-info shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <p class="font-mono text-sm text-muted line-through truncate">
                    {{ suggestion.searchedName }}
                  </p>
                  <p class="font-mono text-sm text-success truncate">
                    {{ suggestion.suggestedCard.name }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex gap-2 ml-6">
              <UButton
                size="xs"
                color="info"
                variant="solid"
                icon="i-lucide-check"
                @click="emit('apply', suggestion.searchedName, suggestion.suggestedCard.name)"
              >
                Applica
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="emit('dismiss', suggestion.searchedName)"
              >
                Ignora
              </UButton>
            </div>
          </li>
        </ul>
      </div>

      <div class="flex items-start gap-2 text-xs text-muted">
        <UIcon
          name="i-lucide-lightbulb"
          class="size-4 mt-0.5 shrink-0"
        />
        <span>
          Le correzioni sono state trovate tramite ricerca fuzzy su Scryfall.
        </span>
      </div>
    </div>
  </UCard>
</template>
