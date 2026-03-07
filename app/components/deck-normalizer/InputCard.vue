<script setup lang="ts">
interface Props {
  modelValue: string
  lineCount: number
  isLoading: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'normalize'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
</script>

<template>
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
        <div class="flex items-center gap-2">
          <UBadge
            v-if="modelValue.trim()"
            color="neutral"
            variant="subtle"
          >
            {{ lineCount }} righe
          </UBadge>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="subtle"
            :disabled="!modelValue.trim()"
            aria-label="Svuota input"
            @click="emit('update:modelValue', '')"
          />
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <UButton
        icon="i-lucide-wand-sparkles"
        size="lg"
        block
        :loading="isLoading"
        :disabled="!modelValue.trim()"
        @click="emit('normalize')"
      >
        {{ isLoading ? 'Normalizzazione in corso...' : 'Normalizza Mazzo' }}
      </UButton>

      <!-- ========== TEST BUTTONS - REMOVE LATER ========== -->
      <div class="flex gap-2">
        <UButton
          icon="i-lucide-flask-conical"
          color="neutral"
          variant="outline"
          size="sm"
          class="flex-1"
          @click="emit('update:modelValue', '4 Quirion Ran\n4 Lightning Bolt\n4 Llanower Elfs')"
        >
          Test: Fuzzy Match
        </UButton>
        <UButton
          icon="i-lucide-flask-conical"
          color="neutral"
          variant="outline"
          size="sm"
          class="flex-1"
          @click="emit('update:modelValue', '4 Lightning Bolt\n4 Counterspell\n4 Brainstorm\n4 Ponder\n4 Preordain\n4 Delver of Secrets\n4 Spellstutter Sprite\n2 Ninja of the Deep Hours\n2 Snap\n2 Gut Shot\n18 Island\n4 Spire Bluff Canal\n2 Mountain\n2 Sulfur Falls')"
        >
          Test: Valid Deck
        </UButton>
      </div>
      <!-- ========== END TEST BUTTONS ========== -->

      <UTextarea
        v-model="localValue"
        autoresize
        color="primary"
        variant="outline"
        size="lg"
        autofocus
        placeholder="Incolla la lista del tuo mazzo qui..."
        class="font-mono w-full"
      />
    </div>
  </UCard>
</template>
