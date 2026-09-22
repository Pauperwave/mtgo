<!-- app/components/deck-normalizer/ContentBlockCard.vue -->
<script setup lang="ts">
import type { NormalizedCard } from '~/types/deck'
import { detectDeckGradient } from '~/utils/deck-gradient'
import { getDecklistStyles, getManaSequence, GRADIENT_OPTIONS } from '~/utils/decklist-styles'

interface Props {
  output: string
  normalizedCards: NormalizedCard[]
  copied: boolean
}

interface Emits {
  (e: 'copy', block: string): void
}

const { output, normalizedCards, copied } = defineProps<Props>()
const emit = defineEmits<Emits>()

const name = defineModel<string>('name', { default: '' })
const player = defineModel<string>('player', { default: '' })
const placement = defineModel<string>('placement', { default: 'Winner' })

const autoDetectedGradient = computed(() => detectDeckGradient(normalizedCards) ?? '')

// reka-ui's SelectItem forbids an empty-string value, so "follow auto-detection"
// is represented by this sentinel instead of ''
const AUTO_GRADIENT = 'auto'
const gradientOverride = ref(AUTO_GRADIENT)

const gradient = computed(() =>
  gradientOverride.value === AUTO_GRADIENT ? autoDetectedGradient.value : gradientOverride.value
)

const gradientSelectItems = computed(() => [
  { label: `Auto (${autoDetectedGradient.value || 'non rilevato'})`, value: AUTO_GRADIENT },
  ...GRADIENT_OPTIONS.map(g => ({ label: g, value: g }))
])

const previewStyles = computed(() => getDecklistStyles(gradient.value))

// Mana symbols shown next to each gradient option, same icon set as blog's header
function manaSequenceFor(value: string) {
  const resolved = value === AUTO_GRADIENT ? autoDetectedGradient.value : value
  return resolved ? getManaSequence(resolved) : ''
}

function labelFor(value: string) {
  return gradientSelectItems.value.find(item => item.value === value)?.label ?? value
}

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

function copyBlock() {
  emit('copy', block.value)
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
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField label="Nome mazzo">
          <UInput
            v-model="name"
            placeholder="R Madness"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Piazzamento">
          <UInput
            v-model="placement"
            placeholder="Winner"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Giocatore">
          <UInput
            v-model="player"
            placeholder="Pietro Bragioto"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Header gradient">
          <USelect
            v-model="gradientOverride"
            :items="gradientSelectItems"
            class="w-full"
          >
            <template #default="{ modelValue }">
              <span class="flex items-center gap-1.5 min-w-0">
                <ManaSymbol :sequence="manaSequenceFor(modelValue as string)" />
                <span class="truncate">{{ labelFor(modelValue as string) }}</span>
              </span>
            </template>

            <template #item-leading="{ item }">
              <ManaSymbol :sequence="manaSequenceFor(item.value)" />
            </template>
          </USelect>
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
            <div class="flex items-center gap-2">
              <h2
                class="text-xl font-semibold leading-tight m-0"
                :class="previewStyles.textClasses.heading"
              >
                {{ name || 'Nome mazzo' }}
              </h2>
              <ManaSymbol :sequence="getManaSequence(gradient)" />
            </div>
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
