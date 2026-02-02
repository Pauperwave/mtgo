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
        cmc: card.cmc,
        mana_cost: card.mana_cost ?? null,
        oracle_text: card.oracle_text ?? '',
        color_identity: card.color_identity ?? []
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Fetch card data from Scryfall API
 * Returns both found cards and fuzzy match suggestions for missing cards
 */
export async function fetchScryfallData(cardNames: string[]): Promise<FetchResult> {
  const uniqueNames = [...new Set(cardNames)]
  const allCards: ScryfallCard[] = []

  // Map to track which original names we've found cards for (exact match from collection)
  const foundExactMatch = new Set<string>()

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
          cmc: card.cmc,
          mana_cost: card.mana_cost ?? null,
          oracle_text: card.oracle_text ?? '',
          color_identity: card.color_identity ?? []
        })

        // Mark original names as found IF they match exactly (case-sensitive)
        for (const originalName of batch) {
          const normalized = normalizeCardNameForLookup(originalName)
          if (normalized === card.name) {
            foundExactMatch.add(originalName)
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

  console.log('Found exact matches:', Array.from(foundExactMatch))
  console.log('Unique names:', uniqueNames)

  // Find cards that weren't found in the batch requests
  const notFoundNames = uniqueNames.filter(name => !foundExactMatch.has(name))

  console.log('Not found (need fuzzy search):', notFoundNames)

  // Try to fetch cards that weren't found using fuzzy search
  const suggestions: Array<{
    searchedName: string
    suggestedCard: ScryfallCard
  }> = []

  const stillNotFound: string[] = []

  if (notFoundNames.length > 0) {
    for (const cardName of notFoundNames) {
      console.log(`Fuzzy searching for: "${cardName}"`)
      const card = await fetchSingleCard(cardName)

      if (card) {
        console.log(`Found fuzzy match: "${cardName}" -> "${card.name}"`)

        // Always add as suggestion if the names don't match exactly (character by character)
        if (cardName !== card.name) {
          console.log(`Adding as suggestion (names differ)`)
          suggestions.push({
            searchedName: cardName,
            suggestedCard: card
          })
        } else {
          console.log(`Adding directly (same name)`)
          allCards.push(card)
        }
      } else {
        console.log(`No fuzzy match found for: "${cardName}"`)
        stillNotFound.push(cardName)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // If still some cards weren't found, throw error
    if (stillNotFound.length > 0) {
      const cardLabel = stillNotFound.length > 1 ? 'Le seguenti carte non sono state trovate' : 'La seguente carta non è stata trovata'
      const cardList = stillNotFound.map(name => `• ${name}`).join('\n')

      throw new Error(
        `${cardLabel} su Scryfall:\n\n${cardList}\n\nVerifica l'ortografia o prova a usare il nome esatto della carta da Scryfall.`
      )
    }
  }

  console.log('Final suggestions:', suggestions)

  return {
    cards: allCards,
    suggestions
  }
}
