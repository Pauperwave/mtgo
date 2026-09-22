<!--
  app/components/deck-normalizer/ManaSymbol.vue

  Renders mana-font icons for a color sequence (e.g. "wu", "brg").
  Ported from blog/app/components/magic/card/ManaSymbol.vue, trimmed to the
  color-sequence path only (no single-symbol/{2}/{T} support needed here).

  IMPORTANT: mana-font is imported scoped to avoid clashing with Tailwind's
  own "ms-*" (margin-inline-start) utility classes.
-->
<script setup lang="ts">
interface Props {
  /** Lowercase color sequence, e.g. "w", "wu", "brg" */
  sequence: string
}

const { sequence } = defineProps<Props>()

const colorSymbols = computed(() => sequence.split(''))
</script>

<template>
  <span
    v-if="sequence"
    class="mana-sequence"
  >
    <i
      v-for="(s, i) in colorSymbols"
      :key="i"
      :class="`ms ms-${s} ms-cost`"
      :title="s.toUpperCase()"
    />
  </span>
</template>

<style scoped>
@import "mana-font/css/mana.css";

i.ms {
  font-size: 14px;
  vertical-align: middle;
  margin-inline-start: 0 !important;
}

.mana-sequence {
  display: inline-flex;
  gap: 0.2em;
  vertical-align: middle;
}
</style>
