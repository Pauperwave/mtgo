<script setup lang="ts">
interface Props {
  items: ChecklistItem[]
  completedCount: number
  totalCount: number
  isLoading: boolean
}

defineProps<Props>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-list-checks"
            class="size-5 text-primary"
          />
          <h3 class="text-sm font-semibold">
            Progresso
          </h3>
        </div>
        <UBadge
          :color="completedCount === totalCount ? 'success' : 'neutral'"
          variant="subtle"
          :label="`${completedCount}/${totalCount}`"
        />
      </div>
    </template>

    <div class="space-y-3">
      <!-- Progress Bar -->
      <UProgress
        :model-value="completedCount"
        :max="totalCount"
        color="primary"
        size="sm"
      />

      <!-- Checklist Items -->
      <ul class="space-y-2 text-sm">
        <li
          v-for="item in items"
          :key="item.id"
          class="space-y-1"
        >
          <div class="flex items-start gap-2">
            <UIcon
              :name="item.icon.value"
              :class="[
                'size-4 mt-0.5 shrink-0 transition-colors',
                item.color.value,
                isLoading && item.id === 'normalize' ? 'animate-spin' : ''
              ]"
            />
            <span
              :class="[
                'transition-colors',
                item.completed.value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
              ]"
            >
              {{ item.label }}
            </span>
          </div>

          <!-- Child items (sub-steps) -->
          <ul
            v-if="item.children"
            class="ml-6 space-y-1"
          >
            <li
              v-for="child in item.children"
              :key="child.id"
              class="flex items-start gap-2"
            >
              <UIcon
                :name="child.icon.value"
                :class="[
                  'size-4 mt-0.5 shrink-0 transition-colors',
                  child.color.value
                ]"
              />
              <span
                :class="[
                  'text-xs transition-colors',
                  child.completed.value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                ]"
              >
                {{ child.label }}
              </span>
            </li>
          </ul>
        </li>
      </ul>

      <!-- Completion Message -->
      <UAlert
        v-if="completedCount === totalCount"
        color="success"
        variant="soft"
        icon="i-lucide-party-popper"
        title="Complimenti! Hai completato tutti i passaggi."
        class="mt-4"
      />
    </div>
  </UCard>
</template>
