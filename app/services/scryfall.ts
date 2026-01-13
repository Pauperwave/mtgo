/**
 * Scryfall API integration
 * Handles fetching card data with batching and rate limiting
 */

import type { ScryfallCard } from '~/types/deck';

/**
 * Fetch card data from Scryfall API
 * Automatically handles batching (75 cards per request) and rate limiting
 */
export async function fetchScryfallData(
  cardNames: string[]
): Promise<ScryfallCard[]> {
  const uniqueNames = [...new Set(cardNames)];
  const allCards: ScryfallCard[] = [];

  // Scryfall collection endpoint accepts max 75 cards per request
  const BATCH_SIZE = 75;

  for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
    const batch = uniqueNames.slice(i, i + BATCH_SIZE);
    const identifiers = batch.map((name) => ({ name }));

    try {
      const response = await fetch(
        'https://api.scryfall.com/cards/collection',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ identifiers }),
        }
      );

      if (!response.ok) {
        throw new Error(`Scryfall API error: ${response.status}`);
      }

      const data = await response.json();

      for (const card of data.data) {
        allCards.push({
          name: card.name,
          type_line: card.type_line,
          cmc: card.cmc, // ← Added
        });
      }

      // Scryfall rate limit: ~100ms between requests
      if (i + BATCH_SIZE < uniqueNames.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      throw new Error(
        `Failed to fetch Scryfall data for batch starting at "${batch[0]}": ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }

  return allCards;
}
