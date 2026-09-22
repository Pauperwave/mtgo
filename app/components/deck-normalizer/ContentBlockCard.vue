<!-- app/components/deck-normalizer/ContentBlockCard.vue -->
<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import type { NormalizedCard } from '~/types/deck'
import { detectDeckGradient } from '~/utils/deck-gradient'
import { getDecklistStyles } from '~/utils/decklist-styles'

interface Props {
  output: string
  normalizedCards: NormalizedCard[]
}

const { output, normalizedCards } = defineProps<Props>()

const name = defineModel<string>('name', { default: '' })
const player = defineModel<string>('player', { default: '' })
const placement = defineModel<string>('placement', { default: 'Winner' })

const gradient = computed(() => detectDeckGradient(normalizedCards) ?? '')

const previewStyles = computed(() => getDecklistStyles(gradient.value))

const block = computed(() => {
  return [
    '::magic-decklist',
    '---',
    `name: ${name.value}`,
    `player: ${player.value}`,
    `placement: ${placement.value}`,
    `headerGradient: ${gradient.value}`,
    '---',
    output,
    '::'
  ].join('\n')
})

const { copy, copied } = useClipboard()

function copyBlock() {
  copy(block.value)
}
</script>

<template>
  <CollapsibleCard
    border-class="border-primary/20"
    :default-open="true"
  >
    <template #header-icon>
      <UIcon
        name="i-lucide-file-code-2"
        class="size-5 text-primary"
      />
    </template>

    <template #header-title>
      Blocco Nuxt Content
    </template>

    <template #header-actions>
      <UButton
        size="xs"
        variant="ghost"
        color="primary"
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        :label="copied ? 'Copiato!' : 'Copia'"
        class="cursor-pointer"
        @click.stop="copyBlock"
      />
    </template>

    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <UFormField label="Nome mazzo">
          <UInput
            v-model="name"
            placeholder="R Madness"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Player">
          <UInput
            v-model="player"
            placeholder="Paolo Baroni"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Placement">
          <UInput
            v-model="placement"
            placeholder="Winner"
            class="w-full"
          />
        </UFormField>
      </div>

      <UAlert
        v-if="!gradient"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-triangle"
        title="Gradient non rilevato"
        description="Colore del mazzo non determinabile automaticamente (4+ colori o carte senza mana cost). Imposta headerGradient a mano."
      />

      <!-- Preview of the blog's decklist header, matching Decklist.vue's #header markup -->
      <div
        v-else
        class="relative p-4 rounded-lg overflow-hidden"
        :class="previewStyles.headerClass"
      >
        <div class="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2">
          <div class="flex flex-col gap-1">
            <h2
              class="text-xl font-semibold leading-tight m-0"
              :class="previewStyles.textClasses.heading"
            >
              {{ name || 'Nome mazzo' }}
            </h2>
            <p
              v-if="player"
              class="text-base font-semibold leading-tight m-0"
              :class="previewStyles.textClasses.subheading"
            >
              {{ player }}
            </p>
          </div>
          <div
            v-if="placement"
            class="text-right text-base font-semibold"
            :class="previewStyles.textClasses.placement"
          >
            {{ placement }}
          </div>
        </div>
      </div>

      <div class="rounded-lg overflow-y-auto">
        <pre class="text-sm font-mono whitespace-pre-wrap">{{ block }}</pre>
      </div>
    </div>
  </CollapsibleCard>
</template>
