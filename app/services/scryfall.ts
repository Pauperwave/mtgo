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
  return name.split('//')[0].trim()
}

/**
 * Fetch a single card by exact or fuzzy name
 */
async function fetchSingleCard(cardName: string): Promise<ScryfallCard | null> {
  try {
    const searchName = normalizeCardNameForLookup(cardName)

    // Try exact match first
    const exactResponse = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(searchName)}`
    )

    if (exactResponse.ok) {
      const card = await exactResponse.json()
      return {
        name: card.name,
        type_line: card.type_line,
        cmc: card.cmc
      }
    }

    // Try fuzzy match if exact fails
    const fuzzyResponse = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(searchName)}`
    )

    if (fuzzyResponse.ok) {
      const card = await fuzzyResponse.json()
      console.warn(`Fuzzy matched "${cardName}" to "${card.name}"`)
      return {
        name: card.name,
        type_line: card.type_line,
        cmc: card.cmc
      }
    }

    return null
  } catch (err) {
    return null
  }
}

/**
 * Fetch card data from Scryfall API
 * Automatically handles batching (75 cards per request) and rate limiting
 */
export async function fetchScryfallData(cardNames: string[]): Promise<ScryfallCard[]> {
  const uniqueNames = [...new Set(cardNames)]
  const allCards: ScryfallCard[] = []
  const notFound: string[] = []

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

      // Add all found cards
      for (const card of data.data) {
        allCards.push({
          name: card.name,
          type_line: card.type_line,
          cmc: card.cmc
        })
      }

      // Track not found cards
      if (data.not_found && data.not_found.length > 0) {
        for (const item of data.not_found) {
          if (item.name) {
            notFound.push(item.name)
          }
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
  if (notFound.length > 0) {
    const stillNotFound: string[] = []

    for (const cardName of notFound) {
      const card = await fetchSingleCard(cardName)

      if (card) {
        allCards.push(card)
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

  return allCards
}
