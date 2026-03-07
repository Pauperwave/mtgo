/**
 * POST /api/cards/resolve
 * 
 * Resolves card names to full card data using hybrid SQLite + Scryfall approach.
 * 
 * Strategy:
 * 1. Look up all cards in local SQLite database (normalized names)
 * 2. For any missing cards, batch fetch from Scryfall Collection API
 * 3. Track name mappings (input → canonical) for analytics
 * 4. Return all cards + name mappings + missing list
 */

import type { ResolveCardsRequest, ResolveCardsResponse, Card, ScryfallCard } from '../../../shared/types'
import { 
  getCardsByNormalizedNames, 
  upsertNameMapping 
} from '../../utils/card-database'

/**
 * Scryfall Collection API endpoint (batch lookup)
 * Accepts up to 75 card identifiers per request
 */
const SCRYFALL_COLLECTION_API = 'https://api.scryfall.com/cards/collection'

/**
 * Convert Scryfall API card to our Card type
 */
function scryfallToCard(scryfallCard: ScryfallCard): Card {
  return {
    id: scryfallCard.id,
    name: scryfallCard.name,
    type_line: scryfallCard.type_line,
    mana_cost: scryfallCard.mana_cost || null,
    oracle_text: scryfallCard.oracle_text || null,
    colors: JSON.stringify(scryfallCard.colors || []),
    color_identity: JSON.stringify(scryfallCard.color_identity || []),
    keywords: JSON.stringify(scryfallCard.keywords || []),
    legalities: JSON.stringify(scryfallCard.legalities),
    rarity: scryfallCard.rarity,
    set_code: scryfallCard.set,
    set_name: scryfallCard.set_name,
    collector_number: scryfallCard.collector_number,
    image_uris: scryfallCard.image_uris ? JSON.stringify(scryfallCard.image_uris) : null,
    card_faces: scryfallCard.card_faces ? JSON.stringify(scryfallCard.card_faces) : null,
    layout: scryfallCard.layout,
    cmc: scryfallCard.cmc,
    power: scryfallCard.power || null,
    toughness: scryfallCard.toughness || null,
    loyalty: scryfallCard.loyalty || null,
    created_at: new Date().toISOString()
  }
}

/**
 * Fetch missing cards from Scryfall Collection API (batch)
 */
async function fetchMissingCardsFromScryfall(missingNames: string[]): Promise<Map<string, Card>> {
  const result = new Map<string, Card>()
  
  if (missingNames.length === 0) {
    return result
  }

  // Scryfall Collection API accepts max 75 identifiers per request
  const BATCH_SIZE = 75
  const batches: string[][] = []
  
  for (let i = 0; i < missingNames.length; i += BATCH_SIZE) {
    batches.push(missingNames.slice(i, i + BATCH_SIZE))
  }

  // Process batches sequentially to respect rate limits
  for (const batch of batches) {
    try {
      const identifiers = batch.map(name => ({ name }))
      
      const response = await fetch(SCRYFALL_COLLECTION_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifiers })
      })

      if (!response.ok) {
        console.error(`Scryfall API error: ${response.status} ${response.statusText}`)
        continue
      }

      const data = await response.json()
      
      // Map found cards
      if (data.data && Array.isArray(data.data)) {
        for (const scryfallCard of data.data as ScryfallCard[]) {
          const card = scryfallToCard(scryfallCard)
          
          // Find which input name matched this card
          const matchingInputName = batch.find(name => 
            name.toLowerCase() === scryfallCard.name.toLowerCase()
          )
          
          if (matchingInputName) {
            result.set(matchingInputName, card)
          }
        }
      }

      // Handle not_found entries
      if (data.not_found && Array.isArray(data.not_found)) {
        for (const notFound of data.not_found) {
          console.warn(`Card not found on Scryfall: ${notFound.name}`)
        }
      }

      // Rate limiting: wait 100ms between requests
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('Error fetching from Scryfall:', error)
    }
  }

  return result
}

export default defineEventHandler(async (event): Promise<ResolveCardsResponse> => {
  try {
    // Parse request body
    const body = await readBody<ResolveCardsRequest>(event)
    
    if (!body.names || !Array.isArray(body.names)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: names array is required'
      })
    }

    const inputNames = body.names
    const cards: Card[] = []
    const nameMappings: Record<string, string> = {}
    const missing: string[] = []

    // Step 1: Look up all cards in SQLite database (normalized)
    const dbCards = await getCardsByNormalizedNames(inputNames)

    // Step 2: Separate found vs missing
    const missingNames: string[] = []
    
    for (const inputName of inputNames) {
      const card = dbCards.get(inputName)
      
      if (card) {
        // Found in database
        cards.push(card)
        nameMappings[inputName] = card.name
        
        // Track name mapping (increment hit count)
        if (inputName !== card.name) {
          await upsertNameMapping(inputName, card.name)
        }
      } else {
        // Not found in database - need to fetch from Scryfall
        missingNames.push(inputName)
      }
    }

    // Step 3: Fetch missing cards from Scryfall (batch)
    if (missingNames.length > 0) {
      console.log(`Fetching ${missingNames.length} missing cards from Scryfall...`)
      
      const scryfallCards = await fetchMissingCardsFromScryfall(missingNames)
      
      for (const [inputName, card] of scryfallCards.entries()) {
        cards.push(card)
        nameMappings[inputName] = card.name
        
        // Track name mapping
        if (inputName !== card.name) {
          await upsertNameMapping(inputName, card.name)
        }
      }
      
      // Any still missing after Scryfall fetch
      for (const name of missingNames) {
        if (!scryfallCards.has(name)) {
          missing.push(name)
        }
      }
    }

    // Return response
    return {
      cards,
      nameMappings,
      missing,
      errors: missing.length > 0 ? [`Could not find ${missing.length} card(s): ${missing.join(', ')}`] : undefined
    }

  } catch (error) {
    console.error('Error in /api/cards/resolve:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
})
