<script setup lang="ts">
/**
 * TEST COMPONENT - REMOVE LATER
 * Provides quick-fill buttons for testing deck normalization
 */

interface Emits {
  (e: 'load-deck', deckText: string): void
}

const emit = defineEmits<Emits>()

// Test deck with fuzzy matches (typos)
const FUZZY_MATCH_DECK = `4 Quirion Ran
4 Lightning Bolt
4 Llanower Elfs`

// Test deck: Walls Combo (real Pauper deck)
const WALLS_COMBO_DECK = `1 Jaspera Sentinel
2 Quirion Ranger
4 Saruli Caretaker
2 Tinder Wall
1 Gatecreeper Vine
4 Masked Vandal
3 Mesmeric Fiend
4 Overgrown Battlement
3 Wall of Roots
4 Balustrade Spy
4 Sagu Wildling // Roost Seek
4 Generous Ent
1 Troll of Khazad-dûm
2 Lotleth Giant
1 Nyxborn Hydra
4 Land Grant
4 Winding Way
4 Lead the Stampede
2 Dread Return
2 Lotus Petal
3 Forest
1 Swamp

Sideboard
4 Healer of the Glade
3 Avenging Hunter
2 Accursed Marauder
2 Faerie Macabre
2 Fang Dragon // Forktail Sweep
1 Flaring Pain
1 Swamp`
</script>

<template>
  <div class="flex gap-2">
    <UButton
      icon="i-lucide-flask-conical"
      color="neutral"
      variant="outline"
      block
      class="flex-1 cursor-pointer"
      @click="emit('load-deck', FUZZY_MATCH_DECK)"
    >
      Test: Fuzzy Match
    </UButton>
    <UButton
      icon="i-lucide-flask-conical"
      color="neutral"
      variant="outline"
      block
      class="flex-1 cursor-pointer"
      @click="emit('load-deck', WALLS_COMBO_DECK)"
    >
      Test: Walls Combo
    </UButton>
  </div>
</template>
