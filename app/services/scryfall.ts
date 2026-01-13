/**
 * Scryfall API integration
 * Handles fetching card data with batching and rate limiting
 */

import type { ScryfallCard } from '~/types/deck'

/**
 * Normalize card name for Scryfall lookup
 * Removes the back face of split/adventure/MDFC cards
 */
function normalizeCardNameForLookup(name: string): string {
  const frontFace = name.split('//')[0]
  return frontFace ? frontFace.trim() : name.trim()
}

/**
 * Result from fetching card data
 * Includes both found cards and suggestions for missing ones
 */
export interface FetchResult {
  cards: ScryfallCard[]
  suggestions: Array<{
    searchedName: string
    suggestedCard: ScryfallCard
  }>
}

/**
 * Fetch a single card by fuzzy name
 * This handles case-insensitive and typo-tolerant matching
 */
async function fetchSingleCard(cardName: string): Promise<ScryfallCard | null> {
  try {
    const searchName = normalizeCardNameForLookup(cardName)

    // Use fuzzy match (it handles case-insensitivity and typos)
    const fuzzyResponse = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(searchName)}`
    )

    if (fuzzyResponse.ok) {
      const card = await fuzzyResponse.json()
      return {
        name: card.name,
        type_line: card.type_line,
        cmc: card.cmc
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if two card names match (case-insensitive)
 */
function cardNamesMatch(name1: string, name2: string): boolean {
  return name1.toLowerCase() === name2.toLowerCase()
}

/**
 * Fetch card data from Scryfall API
 * Returns both found cards and fuzzy match suggestions for missing cards
 */
export async function fetchScryfallData(cardNames: string[]): Promise<FetchResult> {
  const uniqueNames = [...new Set(cardNames)]
  const allCards: ScryfallCard[] = []
  const notFoundNames: string[] = []

  // Scryfall collection endpoint accepts max 75 cards per request
  const BATCH_SIZE = 75

  for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
    const batch = uniqueNames.slice(i, i + BATCH_SIZE)
    // Normalize names for lookup (remove back faces)
    const identifiers = batch.map(name => ({
      name: normalizeCardNameForLookup(name)
    }))

    try {
      const response = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifiers })
      })

      if (!response.ok) {
        throw new Error(`Scryfall API error: ${response.status}`)
      }

      const data = await response.json()

      // Track which names from our batch were found
      const foundInBatch = new Set<string>()

      // Add all found cards
      for (const card of data.data) {
        allCards.push({
          name: card.name,
          type_line: card.type_line,
          cmc: card.cmc
        })

        // Mark this card as found (case-insensitive)
        const matchingBatchName = batch.find(batchName =>
          cardNamesMatch(normalizeCardNameForLookup(batchName), card.name)
        )
        if (matchingBatchName) {
          foundInBatch.add(matchingBatchName.toLowerCase())
        }
      }

      // Track cards from this batch that weren't found
      for (const originalName of batch) {
        if (!foundInBatch.has(originalName.toLowerCase())) {
          notFoundNames.push(originalName)
        }
      }

      // Scryfall rate limit: ~100ms between requests
      if (i + BATCH_SIZE < uniqueNames.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (err) {
      throw new Error(
        `Failed to fetch Scryfall data: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  // Try to fetch cards that weren't found using fuzzy search
  const suggestions: Array<{
    searchedName: string
    suggestedCard: ScryfallCard
  }> = []

  const stillNotFound: string[] = []

  if (notFoundNames.length > 0) {
    for (const cardName of notFoundNames) {
      const card = await fetchSingleCard(cardName)

      if (card) {
        // Check if this is actually a different card (case mismatch or typo)
        const isDifferentCard = !cardNamesMatch(cardName, card.name)

        if (isDifferentCard) {
          // Found a fuzzy match - add as suggestion
          suggestions.push({
            searchedName: cardName,
            suggestedCard: card
          })
        } else {
          // Same card, just case mismatch - add directly without suggestion
          allCards.push(card)
        }
      } else {
        stillNotFound.push(cardName)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // If still some cards weren't found, throw error
    if (stillNotFound.length > 0) {
      throw new Error(
        `Could not find the following card${stillNotFound.length > 1 ? 's' : ''} on Scryfall:\n\n${stillNotFound.map(name => `• ${name}`).join('\n')}\n\nPlease check the spelling or try using the exact card name from Scryfall.`
      )
    }
  }

  return {
    cards: allCards,
    suggestions
  }
}
