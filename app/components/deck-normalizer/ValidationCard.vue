<script setup lang="ts">
import type { ValidationResult } from '~/utils/deck-validator'

interface Props {
  validation: ValidationResult
}

defineProps<Props>()
</script>

<template>
  <UCard
    v-if="!validation.isValid || validation.warnings.length > 0"
    :color="validation.isValid ? 'warning' : 'error'"
    :class="validation.isValid ? 'border-warning/50' : 'border-error/50'"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            :name="validation.isValid ? 'i-lucide-alert-triangle' : 'i-lucide-alert-circle'"
            :class="validation.isValid ? 'size-5 text-warning' : 'size-5 text-error'"
          />
          <h2 class="text-lg font-semibold">
            {{ validation.isValid ? 'Attenzione' : 'Errori di Validazione' }}
          </h2>
        </div>
        <UBadge
          :color="validation.isValid ? 'warning' : 'error'"
          variant="subtle"
        >
          {{ validation.stats.mainDeckCount }} + {{ validation.stats.sideboardCount }} carte
        </UBadge>
      </div>
    </template>

    <div class="space-y-3">
      <!-- Errors -->
      <div
        v-if="validation.errors.length > 0"
        class="space-y-2"
      >
        <p class="text-sm font-semibold text-error">
          Errori ({{ validation.errors.length }}):
        </p>
        <div class="bg-error/5 rounded-lg p-3 border border-error/20">
          <ul class="space-y-1.5">
            <li
              v-for="(error, index) in validation.errors"
              :key="index"
              class="flex items-start gap-2 text-sm"
            >
              <UIcon
                name="i-lucide-x-circle"
                class="size-4 text-error shrink-0 mt-0.5"
              />
              <span>{{ error.message }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Warnings -->
      <div
        v-if="validation.warnings.length > 0"
        class="space-y-2"
      >
        <p class="text-sm font-semibold text-warning">
          Avvertimenti ({{ validation.warnings.length }}):
        </p>
        <div class="bg-warning/5 rounded-lg p-3 border border-warning/20">
          <ul class="space-y-1.5">
            <li
              v-for="(warning, index) in validation.warnings"
              :key="index"
              class="flex items-start gap-2 text-sm"
            >
              <UIcon
                name="i-lucide-alert-triangle"
                class="size-4 text-warning shrink-0 mt-0.5"
              />
              <span>{{ warning.message }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="flex items-start gap-2 text-muted pt-2 border-t border-default">
        <UIcon
          name="i-lucide-info"
          class="size-4 mt-0.5 shrink-0"
        />
        <div>
          <p><strong>Main deck:</strong> {{ validation.stats.mainDeckCount }} carte</p>
          <p><strong>Sideboard:</strong> {{ validation.stats.sideboardCount }} carte</p>
        </div>
      </div>
    </div>
  </UCard>
</template>
