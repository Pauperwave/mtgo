<!-- app/components/SuggestionsCard.vue -->
<script setup lang="ts">
import type { CardSuggestion } from '~/types/suggestions'
import { CONFIDENCE_DISPLAY, MATCH_TYPE_DISPLAY } from '~/types/suggestions'

interface Props {
  suggestions: readonly CardSuggestion[]
}

interface Emits {
  (e: 'apply', suggestion: CardSuggestion): void
  (e: 'dismiss', searchedName: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function getConfidenceColor(confidence: CardSuggestion['confidence']) {
  return CONFIDENCE_DISPLAY[confidence].color
}

function getConfidenceLabel(confidence: CardSuggestion['confidence']) {
  return CONFIDENCE_DISPLAY[confidence].label
}

function getMatchTypeLabel(matchType: CardSuggestion['matchType']) {
  return MATCH_TYPE_DISPLAY[matchType]
}

function getConfidenceIcon(confidence: CardSuggestion['confidence']) {
  return CONFIDENCE_DISPLAY[confidence].icon
}
</script>

<template>
  <UCard
    color="info"
    class="border-info/50"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-lightbulb"
            class="size-5 text-info"
          />
          <h2 class="text-lg font-semibold">
            Carte Non Riconosciute
          </h2>
        </div>
        <UBadge
          color="warning"
          variant="soft"
        >
          {{ suggestions.length }} {{ suggestions.length === 1 ? 'carta' : 'carte' }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-3">
      <p class="text-sm text-muted">
        {{ suggestions.length > 1 ? 'Le seguenti carte non sono state riconosciute' : 'La seguente carta non è stata riconosciuta' }} esattamente, ma {{ suggestions.length > 1 ? 'sono state trovate corrispondenze' : 'è stata trovata una corrispondenza' }} simili.
        Vuoi applicare {{ suggestions.length > 1 ? 'le correzioni' : 'la correzione' }}?
      </p>

      <div class="bg-info/5 rounded-lg p-3 border border-info/20">
        <ul class="space-y-3">
          <li
            v-for="suggestion in suggestions"
            :key="suggestion.searchedName"
            class="space-y-2"
          >
            <!-- Card names -->
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
                  <p class="font-mono text-sm text-success truncate font-semibold">
                    {{ suggestion.suggestedCard.name }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Confidence and metadata badges -->
            <div class="flex items-center gap-2 ml-6 flex-wrap">
              <UBadge
                :color="getConfidenceColor(suggestion.confidence)"
                size="xs"
                variant="soft"
              >
                <template #leading>
                  <UIcon
                    :name="getConfidenceIcon(suggestion.confidence)"
                    class="size-3"
                  />
                </template>
                {{ getConfidenceLabel(suggestion.confidence) }}
              </UBadge>

              <UBadge
                color="neutral"
                size="xs"
                variant="outline"
              >
                {{ getMatchTypeLabel(suggestion.matchType) }}
              </UBadge>

              <span
                v-if="suggestion.normalizedDistance !== undefined && suggestion.normalizedDistance > 0"
                class="text-xs text-muted"
              >
                distanza: {{ suggestion.normalizedDistance }}
              </span>
            </div>

            <!-- Card type (optional) -->
            <p class="text-xs text-muted ml-6 truncate">
              {{ suggestion.suggestedCard.type_line }}
            </p>

            <!-- Action buttons -->
            <div class="flex gap-2 ml-6">
              <UButton
                size="xs"
                color="info"
                variant="solid"
                icon="i-lucide-check"
                @click="emit('apply', suggestion)"
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
          name="i-lucide-info"
          class="size-4 mt-0.5 shrink-0"
        />
        <div class="space-y-1">
          <p>
            Le correzioni sono state trovate tramite ricerca intelligente su Scryfall.
          </p>
          <p class="text-muted/80">
            Le correzioni automatiche ad alta confidenza sono già state applicate.
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
