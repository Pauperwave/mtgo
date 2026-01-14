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
        <UBadge
          v-if="modelValue.trim()"
          color="neutral"
          variant="subtle"
        >
          {{ lineCount }} righe
        </UBadge>
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
