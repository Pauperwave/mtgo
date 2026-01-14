<script setup lang="ts">
import type { ChecklistItem } from '~/composables/useChecklist'

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
        >
          {{ completedCount }}/{{ totalCount }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-3">
      <!-- Progress Bar -->
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          class="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
          :style="{ width: `${(completedCount / totalCount) * 100}%` }"
        />
      </div>

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
                item.completed.value ? 'text-default' : 'text-muted'
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
                  child.completed.value ? 'text-default' : 'text-muted'
                ]"
              >
                {{ child.label }}
              </span>
            </li>
          </ul>
        </li>
      </ul>

      <!-- Completion Message -->
      <div
        v-if="completedCount === totalCount"
        class="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2"
      >
        <UIcon
          name="i-lucide-party-popper"
          class="size-5 text-success shrink-0"
        />
        <span class="text-sm text-success font-medium">
          Complimenti! Hai completato tutti i passaggi.
        </span>
      </div>
    </div>
  </UCard>
</template>
