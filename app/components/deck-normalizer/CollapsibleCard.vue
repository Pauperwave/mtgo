<script setup lang="ts">
interface Props {
  color?: 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  borderClass?: string
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'neutral',
  borderClass: '',
  defaultOpen: true
})

// defineModel senza default, poi inizializzi manualmente
const isOpen = defineModel<boolean>('open')

// Inizializza se non è stato passato un v-model dal parent
if (isOpen.value === undefined) {
  isOpen.value = props.defaultOpen
}

const ariaLabel = computed(() =>
  isOpen.value ? 'Collapse card' : 'Expand card'
)
</script>

<template>
  <UCard
    :color="color"
    :class="borderClass"
  >
    <template #header>
      <UCollapsible v-model:open="isOpen">
        <!-- Header sempre visibile -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <slot name="header-icon" />
            <h2 class="text-lg font-semibold">
              <slot name="header-title" />
            </h2>
            <slot name="header-badge" />
          </div>

          <div class="flex items-center gap-2">
            <slot name="header-actions" />
            <UButton
              :icon="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              :aria-label="ariaLabel"
              size="xs"
              variant="ghost"
              color="neutral"
              class="transition-transform duration-200"
            />
          </div>
        </div>

        <!-- Content collassabile -->
        <template #content>
          <div class="pt-4">
            <slot />
          </div>
        </template>
      </UCollapsible>
    </template>
  </UCard>
</template>
