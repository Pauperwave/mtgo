/**
 * Parse raw deck list text into structured data
 */

import type { ParsedCard } from '~/types/deck'

export function parseRawDeck(text: string): ParsedCard[] {
  const lines = text.trim().split('\n')
  const cards: ParsedCard[] = []
  let isSideboard = false

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (!trimmedLine) continue

    // Check for sideboard delimiter
    if (/^sideboard$/i.test(trimmedLine)) {
      isSideboard = true
      continue
    }

    // Parse card line: "3 Krark-Clan Shaman"
    const match = trimmedLine.match(/^(\d+)\s+(.+)$/)
    if (match) {
      cards.push({
        quantity: parseInt(match[1]),
        name: match[2],
        isSideboard
      })
    }
  }

  return cards
}
