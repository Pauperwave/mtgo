<script setup lang="ts">
interface Props {
  output: string
  copied: boolean
}

interface Emits {
  (e: 'copy'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <UCard class="border-success/20">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-file-check"
            class="size-5 text-success"
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

    <div class="rounded-lg overflow-y-auto">
      <pre class="text-sm font-mono whitespace-pre-wrap text-gray-900 dark:text-gray-100">{{ output }}</pre>
    </div>
  </UCard>
</template>
