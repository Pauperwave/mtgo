<script setup lang="ts">
interface Props {
  message: string
  lines: string[]
}

defineProps<Props>()
</script>

<template>
  <UCard
    color="error"
    class="border-error/50"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-alert-circle"
          class="size-5 text-error"
        />
        <h2 class="text-lg font-semibold">
          Errore
        </h2>
      </div>
    </template>

    <div class="space-y-3">
      <p class="text-sm text-muted">
        {{ message }}
      </p>

      <div class="bg-error/5 rounded-lg p-3 border border-error/20">
        <ul class="space-y-2">
          <li
            v-for="line in lines"
            :key="line"
            class="flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <UIcon
                name="i-lucide-x-circle"
                class="size-4 text-error shrink-0"
              />
              <span class="font-mono text-sm">{{ line }}</span>
            </div>
            <UButton
              :to="`https://scryfall.com/search?q=${encodeURIComponent(line)}`"
              target="_blank"
              size="xs"
              variant="soft"
              color="error"
              icon="i-lucide-search"
              trailing
            >
              Cerca
            </UButton>
          </li>
        </ul>
      </div>

      <div class="flex items-start gap-2 text-xs text-muted">
        <UIcon
          name="i-lucide-lightbulb"
          class="size-4 mt-0.5 shrink-0"
        />
        <span>
          Clicca su "Cerca" per trovare la carta su Scryfall e verificare il nome esatto.
        </span>
      </div>
    </div>
  </UCard>
</template>
