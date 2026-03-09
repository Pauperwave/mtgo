<script setup lang="ts">
interface Props {
  color?: 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  borderClass?: string
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'neutral',
  borderClass: '',
  defaultOpen: false
})

// Stato locale gestito internamente per controllare il toggle manualmente
const isOpen = ref(props.defaultOpen)

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
      <!-- UCollapsible con default-open prop -->
      <UCollapsible
        :default-open="props.defaultOpen"
      >
        <!-- Header - pointer-events-none impedisce il click -->
        <div class="flex items-center justify-between pointer-events-none">
          <div class="flex items-center gap-2">
            <slot name="header-icon" />
            <h2 class="text-lg font-semibold">
              <slot name="header-title" />
            </h2>
            <slot name="header-badge" />
          </div>

          <div class="flex items-center gap-2">
            <!-- Re-abilita pointer-events per i bottoni nell'header -->
            <div class="pointer-events-auto">
              <slot name="header-actions" />
            </div>

            <!-- Solo questo bottone controlla il toggle - re-abilita pointer-events -->
            <UButton
              :icon="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              :aria-label="ariaLabel"
              size="xs"
              variant="ghost"
              color="neutral"
              class="cursor-pointer transition-transform duration-200 pointer-events-auto"
              @click="isOpen = !isOpen"
            />
          </div>
        </div>

        <!-- Content collassabile -->
        <template #content>
          <div class="mt-4 pt-4 border-t border-default">
            <slot />
          </div>
        </template>
      </UCollapsible>
    </template>
  </UCard>
</template>
