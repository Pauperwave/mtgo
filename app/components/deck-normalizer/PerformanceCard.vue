<script setup lang="ts">
import type { PerformanceStats } from '~/shared/types'

interface Props {
  performance: PerformanceStats
}

const props = defineProps<Props>()

// Calculate cache hit rate percentage
const cacheHitRate = computed(() => {
  if (props.performance.totalRequests === 0) return 0
  return Math.round((props.performance.databaseHits / props.performance.totalRequests) * 100)
})

// Determine badge color based on cache hit rate
const cacheHitColor = computed(() => {
  if (cacheHitRate.value >= 90) return 'success'
  if (cacheHitRate.value >= 70) return 'warning'
  return 'error'
})

// Format time (ms to seconds if > 1000ms)
const formattedTime = computed(() => {
  const ms = props.performance.processingTimeMs
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${ms}ms`
})
</script>

<template>
  <CollapsibleCard
    color="neutral"
    border-class="border-neutral/50"
  >
    <template #header-icon>
      <UIcon
        name="i-lucide-gauge"
        class="size-5 text-primary"
      />
    </template>

    <template #header-title>
      Performance
    </template>

    <template #header-badge>
      <UBadge
        :color="cacheHitColor"
        variant="soft"
      >
        {{ cacheHitRate }}% cache hit
      </UBadge>
    </template>

    <!-- Card body content -->
    <div class="space-y-4">
      <!-- Stats grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Database hits -->
        <div
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-database"
              class="size-4 text-success"
            />
            <span class="text-sm text-muted">Database</span>
          </div>
          <p class="text-2xl font-bold text-success">
            {{ performance.databaseHits }}
          </p>
        </div>

        <!-- Scryfall requests -->
        <div
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-cloud"
              class="size-4 text-warning"
            />
            <span class="text-sm text-muted">API Scryfall</span>
          </div>
          <p class="text-2xl font-bold text-warning">
            {{ performance.scryfallRequests }}
          </p>
        </div>

        <!-- Fuzzy matches -->
        <div
          v-if="performance.fuzzyMatches > 0"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-search"
              class="size-4 text-info"
            />
            <span class="text-sm text-muted">Fuzzy</span>
          </div>
          <p class="text-2xl font-bold text-info">
            {{ performance.fuzzyMatches }}
          </p>
        </div>

        <!-- Not found -->
        <div
          v-if="performance.notFound > 0"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-x-circle"
              class="size-4 text-error"
            />
            <span class="text-sm text-muted">Non Trovate</span>
          </div>
          <p class="text-2xl font-bold text-error">
            {{ performance.notFound }}
          </p>
        </div>

        <!-- Processing time -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-timer"
              class="size-4 text-purple-500"
            />
            <span class="text-sm text-muted">Tempo</span>
          </div>
          <p class="text-2xl font-bold text-purple-500">
            {{ formattedTime }}
          </p>
        </div>
      </div>

      <!-- Progress bar showing database vs API split -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-muted">
          <span>Distribuzione Richieste</span>
          <span>{{ performance.totalRequests }} totali</span>
        </div>
        <div class="flex h-2 overflow-hidden rounded-full bg-neutral/10">
          <div
            class="bg-success"
            :style="{ width: `${(performance.databaseHits / performance.totalRequests) * 100}%` }"
          />
          <div
            class="bg-warning"
            :style="{ width: `${(performance.scryfallRequests / performance.totalRequests) * 100}%` }"
          />
          <div
            v-if="performance.fuzzyMatches > 0"
            class="bg-info"
            :style="{ width: `${(performance.fuzzyMatches / performance.totalRequests) * 100}%` }"
          />
          <div
            v-if="performance.notFound > 0"
            class="bg-error"
            :style="{ width: `${(performance.notFound / performance.totalRequests) * 100}%` }"
          />
        </div>
        <div class="flex items-center gap-3 text-xs">
          <div
            v-if="performance.databaseHits > 0"
            class="flex items-center gap-1"
          >
            <div class="size-2 rounded-full bg-success" />
            <span class="text-muted">DB Locale</span>
          </div>
          <div
            v-if="performance.scryfallRequests > 0"
            class="flex items-center gap-1"
          >
            <div class="size-2 rounded-full bg-warning" />
            <span class="text-muted">API Scryfall</span>
          </div>
          <div
            v-if="performance.fuzzyMatches > 0"
            class="flex items-center gap-1"
          >
            <div class="size-2 rounded-full bg-info" />
            <span class="text-muted">Fuzzy</span>
          </div>
          <div
            v-if="performance.notFound > 0"
            class="flex items-center gap-1"
          >
            <div class="size-2 rounded-full bg-error" />
            <span class="text-muted">Non Trovate</span>
          </div>
        </div>
      </div>

      <!-- Info note -->
      <div class="flex items-start gap-2 text-xs text-muted">
        <UIcon
          name="i-lucide-info"
          class="size-4 mt-0.5 shrink-0"
        />
        <p>
          Il database locale contiene 10.573 carte legali in Pauper, garantendo risposte istantanee per la maggior parte delle richieste.
        </p>
      </div>
    </div>
  </CollapsibleCard>
</template>
