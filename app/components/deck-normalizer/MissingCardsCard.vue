<script setup lang="ts">
interface Props {
  cards: string[]
}

defineProps<Props>()

// Collapse state
const isCollapsed = ref(false)

/**
 * Extract card name from "4x Card Name" format
 * Example: "4x Llanower Elfs" -> "Llanower Elfs"
 */
function extractCardName(cardString: string): string {
  // Match pattern: number + "x" + space + card name
  const match = cardString.match(/^\d+x\s+(.+)$/)
  return match?.[1] || cardString
}
</script>

<template>
  <UCard
    color="warning"
    class="border-warning/50"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-alert-triangle"
            class="size-5 text-warning"
          />
          <h2 class="text-lg font-semibold">
            Carte Non Trovate
          </h2>
        </div>
        <UButton
          :icon="isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="isCollapsed = !isCollapsed"
        />
      </div>
    </template>

    <div
      v-show="!isCollapsed"
      class="space-y-3"
    >
      <p class="text-sm text-muted">
        {{ cards.length > 1 ? 'Le seguenti carte non sono state trovate' : 'La seguente carta non è stata trovata' }} su Scryfall.
        Controlla l'ortografia o il nome della carta.
      </p>

      <div class="bg-warning/5 rounded-lg p-3 border border-warning/20">
        <ul class="space-y-2">
          <li
            v-for="cardName in cards"
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
              :to="`https://scryfall.com/search?q=${encodeURIComponent(extractCardName(cardName))}`"
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
</template>
