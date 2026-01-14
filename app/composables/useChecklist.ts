/**
 * Composable for deck normalization checklist
 */

export interface ChecklistItem {
  id: string
  label: string
  completed: ComputedRef<boolean>
  icon: ComputedRef<string>
  color: ComputedRef<string>
  children?: ChecklistItem[]
}

export function useChecklist(
  input: Ref<string>,
  normalizedOutput: Ref<string>,
  copied: Ref<boolean>,
  isLoading: Ref<boolean>
) {
  const hasInput = computed(() => input.value.trim().length > 0)
  const hasSideboard = computed(() => hasInput.value && /^sideboard$/im.test(input.value))
  const hasNormalized = computed(() => hasInput.value && normalizedOutput.value.length > 0)
  const hasCopied = computed(() => hasInput.value && copied.value)

  const checklistItems = computed<ChecklistItem[]>(() => [
    {
      id: 'paste',
      label: 'Incolla la lista del mazzo in formato MTGO',
      completed: hasInput,
      icon: computed(() => hasInput.value ? 'i-lucide-circle-check' : 'i-lucide-circle'),
      color: computed(() => hasInput.value ? 'text-success' : 'text-muted')
    },
    {
      id: 'sideboard',
      label: 'Usa "Sideboard" su una riga separata per separare le carte del sideboard',
      completed: hasSideboard,
      icon: computed(() => hasSideboard.value ? 'i-lucide-circle-check' : 'i-lucide-circle'),
      color: computed(() => hasSideboard.value ? 'text-success' : 'text-muted')
    },
    {
      id: 'normalize',
      label: 'Clicca "Normalizza Mazzo" per recuperare i dati delle carte e formattare',
      completed: hasNormalized,
      icon: computed(() =>
        hasNormalized.value
          ? 'i-lucide-circle-check'
          : isLoading.value
            ? 'i-lucide-loader-circle'
            : 'i-lucide-circle'
      ),
      color: computed(() =>
        hasNormalized.value
          ? 'text-success'
          : isLoading.value
            ? 'text-warning'
            : 'text-muted'
      ),
      children: [
        {
          id: 'main-sort',
          label: 'Main deck ordinato per valore di mana e poi in ordine alfabetico',
          completed: hasNormalized,
          icon: computed(() => hasNormalized.value ? 'i-lucide-check' : 'i-lucide-arrow-right'),
          color: computed(() => hasNormalized.value ? 'text-success' : 'text-muted')
        },
        {
          id: 'sideboard-sort',
          label: 'Sideboard per quantità e ordine alfabetico',
          completed: hasNormalized,
          icon: computed(() => hasNormalized.value ? 'i-lucide-check' : 'i-lucide-arrow-right'),
          color: computed(() => hasNormalized.value ? 'text-success' : 'text-muted')
        }
      ]
    },
    {
      id: 'copy',
      label: 'Clicca "Copia" per copiare l\'output normalizzato negli appunti',
      completed: hasCopied,
      icon: computed(() => hasCopied.value ? 'i-lucide-circle-check' : 'i-lucide-circle'),
      color: computed(() => hasCopied.value ? 'text-success' : 'text-muted')
    }
  ])

  const completedCount = computed(() => {
    if (!hasInput.value) return 0

    let count = 0
    if (hasInput.value) count++
    if (hasSideboard.value) count++
    if (hasNormalized.value) count++
    if (hasCopied.value) count++
    return count
  })

  const totalCount = 4

  return {
    checklistItems,
    completedCount,
    totalCount
  }
}
