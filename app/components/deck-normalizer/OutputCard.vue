<script setup lang="ts">
import type { NormalizedCard } from '~/types/deck'

interface Props {
  output: string
  copied: boolean
  isPartial?: boolean
  pendingCards?: NormalizedCard[]
  missingCards?: NormalizedCard[]
}

interface Emits {
  (e: 'copy'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Computed for warning message based on actual arrays
const warningMessage = computed(() => {
  if (!props.isPartial) return ''
  
  const parts: string[] = []
  
  // Count pending cards
  const pendingCount = props.pendingCards?.length || 0
  if (pendingCount > 0) {
    parts.push(`${pendingCount} ${pendingCount === 1 ? 'carta in attesa' : 'carte in attesa'} di conferma`)
  }
  
  // Count missing cards
  const missingCount = props.missingCards?.length || 0
  if (missingCount > 0) {
    parts.push(`${missingCount} ${missingCount === 1 ? 'carta non trovata' : 'carte non trovate'}`)
  }
  
  return parts.join(', ')
})

// Create sets of card names for quick lookup
const pendingCardNames = computed(() => {
  return new Set(props.pendingCards?.map(c => c.name) || [])
})

const missingCardNames = computed(() => {
  return new Set(props.missingCards?.map(c => c.name) || [])
})

// Parse output lines and apply styling
interface OutputLine {
  text: string
  isPending: boolean
  isMissing: boolean
  isSection: boolean
}

const styledLines = computed(() => {
  const lines: OutputLine[] = []
  const outputLines = props.output.split('\n')
  
  for (const line of outputLines) {
    const trimmed = line.trim()
    
    // Check if it's a section header (ends with 's' or 'y' and no number at start)
    const isSection = /^[A-Z]/.test(trimmed) && !/^\d/.test(trimmed)
    
    // Extract card name from line like "4 Card Name"
    const match = trimmed.match(/^\d+\s+(.+)$/)
    const cardName = match ? match[1] : null
    
    const isPending = cardName ? pendingCardNames.value.has(cardName) : false
    const isMissing = cardName ? missingCardNames.value.has(cardName) : false
    
    lines.push({
      text: line,
      isPending,
      isMissing,
      isSection
    })
  }
  
  return lines
})

</script>

<template>
  <UCard class="border-success/20">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            :name="isPartial ? 'i-lucide-alert-triangle' : 'i-lucide-file-check'"
            :class="isPartial ? 'size-5 text-warning' : 'size-5 text-success'"
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
          @click="emit('copy')"
        >
          {{ copied ? 'Copiato!' : 'Copia' }}
        </UButton>
      </div>
    </template>

    <!-- Partial output warning -->
    <UAlert
      v-if="isPartial"
      color="warning"
      icon="i-lucide-alert-triangle"
      title="Output Parziale"
      :description="warningMessage"
      class="mb-4"
    />

    <div class="rounded-lg overflow-y-auto">
      <pre class="text-sm font-mono whitespace-pre-wrap"><span 
        v-for="(line, index) in styledLines" 
        :key="index"
        :class="{
          'text-warning': line.isPending,
          'text-error': line.isMissing,
          'text-gray-900 dark:text-gray-100': !line.isPending && !line.isMissing
        }"
      >{{ line.text }}{{ index < styledLines.length - 1 ? '\n' : '' }}</span></pre>
    </div>
  </UCard>
</template>
