<script setup lang="ts">
interface Props {
  color?: 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  borderClass?: string
  defaultCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'neutral',
  borderClass: '',
  defaultCollapsed: false
})

const isCollapsed = ref(props.defaultCollapsed)

const ariaLabel = computed(() => 
  isCollapsed.value ? 'Expand card' : 'Collapse card'
)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
    mode="out-in"
  >
    <!-- Collapsed: matches UCard outline variant -->
    <div
      v-if="isCollapsed"
      key="collapsed"
      class="rounded-lg cursor-pointer transition-colors ring-1 ring-default bg-default hover:bg-elevated"
      :class="borderClass"
      @click="toggleCollapse"
    >
      <div class="p-4 sm:px-6 flex items-center justify-between">
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
            icon="i-lucide-chevron-down"
            :aria-label="ariaLabel"
            size="xs"
            variant="ghost"
            color="neutral"
            class="transition-transform duration-200"
            @click.stop="toggleCollapse"
          />
        </div>
      </div>
    </div>

    <!-- Expanded: full UCard -->
    <UCard
      v-else
      key="expanded"
      :color="color"
      :class="borderClass"
    >
      <template #header>
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
              icon="i-lucide-chevron-up"
              :aria-label="ariaLabel"
              size="xs"
              variant="ghost"
              color="neutral"
              class="transition-transform duration-200"
              @click="toggleCollapse"
            />
          </div>
        </div>
      </template>

      <slot />
    </UCard>
  </Transition>
</template>