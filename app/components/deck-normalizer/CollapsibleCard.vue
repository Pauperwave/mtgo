<script setup lang="ts">
/**
 * CollapsibleCard - Base component for all deck normalizer cards
 * 
 * Wraps UCard with built-in collapse/expand functionality.
 * Uses named slots for flexible header composition.
 */

interface Props {
  color?: string           // UCard color (e.g., 'neutral', 'success', 'error')
  borderClass?: string     // Custom border class (e.g., 'border-neutral/50')
  defaultCollapsed?: boolean  // Start collapsed (default: false)
}

const props = withDefaults(defineProps<Props>(), {
  color: 'neutral',
  borderClass: '',
  defaultCollapsed: false
})

// Collapse state
const isCollapsed = ref(props.defaultCollapsed)

// Compute aria-label based on collapse state
// This will be enhanced when we get the title from slots
const ariaLabel = computed(() => 
  isCollapsed.value ? 'Expand card' : 'Collapse card'
)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <UCard
    :color="color"
    :class="borderClass"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <!-- Left side: Icon, Title, and optional Badge -->
        <div class="flex items-center gap-2">
          <!-- Icon slot -->
          <slot name="header-icon" />
          
          <!-- Title slot -->
          <h2 class="text-lg font-semibold">
            <slot name="header-title" />
          </h2>
          
          <!-- Badge slot (optional) -->
          <slot name="header-badge" />
        </div>

        <!-- Right side: Custom actions + Collapse toggle -->
        <div class="flex items-center gap-2">
          <!-- Custom action buttons (e.g., Copy button for OutputCard) -->
          <slot name="header-actions" />
          
          <!-- Collapse toggle button -->
          <UButton
            :icon="isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
            :aria-label="ariaLabel"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="toggleCollapse"
          />
        </div>
      </div>
    </template>

    <!-- Card body - only render when expanded (v-if removes from DOM completely) -->
    <template v-if="!isCollapsed">
      <slot />
    </template>
  </UCard>
</template>
