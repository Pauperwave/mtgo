<script setup lang="ts">
import type { PerformanceStats } from '~/shared/types'

interface Props {
  performance: PerformanceStats
}

const props = defineProps<Props>()

// Statistiche configurabili
const stats = computed(() => {
  const base = [
    {
      label: 'Database',
      value: props.performance.databaseHits,
      icon: 'i-lucide-database',
      color: 'success',
      bgClass: 'bg-success'
    },
    {
      label: 'API Scryfall',
      value: props.performance.scryfallRequests,
      icon: 'i-lucide-cloud',
      color: 'warning',
      bgClass: 'bg-warning'
    },
    {
      label: 'Fuzzy',
      value: props.performance.fuzzyMatches,
      icon: 'i-lucide-search',
      color: 'info',
      bgClass: 'bg-info'
    },
    {
      label: 'Non Trovate',
      value: props.performance.notFound,
      icon: 'i-lucide-x-circle',
      color: 'error',
      bgClass: 'bg-error'
    }
  ]

  // Filtra quelli con valore > 0 per la progress bar
  return base.filter(stat => stat.value > 0)
})

// Aggiunta del tempo separatamente
const timeStats = computed(() => ({
  label: 'Tempo',
  value: formattedTime.value,
  icon: 'i-lucide-timer',
  textClass: 'text-purple-500'
}))

const cacheHitRate = computed(() => {
  if (props.performance.totalRequests === 0) return 0
  return Math.round((props.performance.databaseHits / props.performance.totalRequests) * 100)
})

const cacheHitColor = computed(() => {
  if (cacheHitRate.value >= 90) return 'success'
  if (cacheHitRate.value >= 70) return 'warning'
  return 'error'
})

const formattedTime = computed(() => {
  const ms = props.performance.processingTimeMs
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
})

const getPercentage = (value: number) => {
  if (props.performance.totalRequests === 0) return 0
  return (value / props.performance.totalRequests) * 100
}
</script>

<template>
  <CollapsibleCard color="neutral">
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

    <div class="space-y-4">
      <!-- Stats grid - completamente refactored -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Stats dinamici -->
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="stat.icon"
              class="size-4"
              :class="`text-${stat.color}`"
            />
            <span class="text-sm text-muted">{{ stat.label }}</span>
          </div>
          <p
            class="text-2xl font-bold"
            :class="`text-${stat.color}`"
          >
            {{ stat.value }}
          </p>
        </div>

        <!-- Tempo processing -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <UIcon
              :name="timeStats.icon"
              class="size-4"
              :class="timeStats.textClass"
            />
            <span class="text-sm text-muted">{{ timeStats.label }}</span>
          </div>
          <p
            class="text-2xl font-bold"
            :class="timeStats.textClass"
          >
            {{ timeStats.value }}
          </p>
        </div>
      </div>

      <!-- Progress bar con segmenti multipli -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-muted">
          <span>Distribuzione Richieste</span>
          <span>{{ performance.totalRequests }} totali</span>
        </div>

        <!-- Progress bar segmentata -->
        <div
          role="progressbar"
          :aria-valuenow="performance.totalRequests"
          :aria-valuemax="performance.totalRequests"
          aria-label="Distribuzione richieste tra database, API e ricerche"
          class="flex h-2 overflow-hidden rounded-full bg-neutral/10"
        >
          <div
            v-for="stat in stats"
            :key="stat.label"
            :class="stat.bgClass"
            :style="{ width: `${getPercentage(stat.value)}%` }"
            :title="`${stat.label}: ${stat.value} (${getPercentage(stat.value).toFixed(1)}%)`"
          />
        </div>

        <!-- Legenda dinamica -->
        <div class="flex items-center gap-3 text-xs flex-wrap">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="flex items-center gap-1"
          >
            <div
              class="size-2 rounded-full"
              :class="stat.bgClass"
            />
            <span class="text-muted">{{ stat.label }}</span>
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
