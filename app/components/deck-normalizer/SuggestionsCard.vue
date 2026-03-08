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

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Collapse state
const isCollapsed = ref(false)

// Group suggestions by searched name
const groupedSuggestions = computed(() => {
  const groups = new Map<string, CardSuggestion[]>()
  
  for (const suggestion of props.suggestions) {
    if (!groups.has(suggestion.searchedName)) {
      groups.set(suggestion.searchedName, [])
    }
    groups.get(suggestion.searchedName)!.push(suggestion)
  }
  
  return Array.from(groups.entries())
})

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
        <div class="flex items-center gap-2">
          <UBadge
            color="warning"
            variant="soft"
          >
            {{ suggestions.length }} {{ suggestions.length === 1 ? 'carta' : 'carte' }}
          </UBadge>
          <UButton
            :icon="isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="isCollapsed = !isCollapsed"
          />
        </div>
      </div>
    </template>

    <div
      v-show="!isCollapsed"
      class="space-y-3"
    >
      <p class="text-sm text-muted">
        {{ suggestions.length > 1 ? 'Le seguenti carte non sono state riconosciute' : 'La seguente carta non è stata riconosciuta' }} esattamente, ma {{ suggestions.length > 1 ? 'sono state trovate corrispondenze' : 'è stata trovata una corrispondenza' }} simile.
        Vuoi applicare {{ suggestions.length > 1 ? 'le correzioni' : 'la correzione' }}?
      </p>

      <!-- Grouped suggestions by searched name -->
      <div class="space-y-4">
        <div
          v-for="[searchedName, cardSuggestions] in groupedSuggestions"
          :key="searchedName"
          class="bg-info/5 rounded-lg p-4 border border-info/20"
        >
          <!-- Searched card name header -->
          <div class="flex items-center gap-2 mb-3 pb-2 border-b border-info/10">
            <UIcon
              name="i-lucide-search"
              class="size-4 text-info shrink-0"
            />
            <span class="font-mono text-sm font-semibold text-muted">
              "{{ searchedName }}"
            </span>
            <UBadge
              color="warning"
              variant="soft"
            >
              {{ cardSuggestions.length }} {{ cardSuggestions.length === 1 ? 'suggerimento' : 'suggerimenti' }}
            </UBadge>
          </div>

          <!-- Suggestions for this searched name -->
          <ul class="space-y-3">
            <li
              v-for="(suggestion, index) in cardSuggestions"
              :key="`${suggestion.searchedName}-${index}`"
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

                <span
                  v-if="suggestion.similarity !== undefined"
                  class="text-xs text-muted"
                >
                  • confidenza: {{ Math.round(suggestion.similarity * 100) }}%
                </span>
              </div>

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
